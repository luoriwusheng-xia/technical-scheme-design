import { z } from 'zod';
import { schemas, jsonSchemas, type SchemaId } from '@aiblocks/ai-schema';
import {
  openaiAdapter,
  anthropicAdapter,
  geminiAdapter,
  kimiAdapter,
  fallbackAdapter,
} from '../adapters/index.js';
import { resilientJsonExtract } from '../utils/resilientParse.js';

// Provider 名称到具体 Adapter 实现的映射表。
const adapters: Record<string, any> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  kimi: kimiAdapter,
  fallback: fallbackAdapter,
};

// generateStructuredOutput 的标准入参。
export interface GenerateOptions {
  provider: 'openai' | 'anthropic' | 'gemini' | 'kimi' | 'fallback';
  schemaId: SchemaId;
  prompt: string;
  model?: string;
  /**
   * 采样温度，控制模型输出的随机性。
   *
   * - 取值范围：0 ~ 2（具体上限取决于模型平台，OpenAI/Anthropic/Gemini 均支持 0~2）。
   * - 值越低（如 0 ~ 0.3）：输出更确定、保守，适合结构化提取、数据抽取等对准确性要求高的场景。
   * - 值越高（如 0.8 ~ 1.2）：输出更随机、有创造性，适合文案生成、头脑风暴等场景。
   * - 默认值：各 Adapter 内部通常默认 0.7；若传 undefined，则交给底层 SDK 自行决定。
   *
   * 注意：对于结构化输出（json_schema / tool_use），建议保持 0 ~ 0.5 之间，
   * 过高的温度可能增加模型“不服从格式”的概率，尤其在 fallback 模型上更为明显。
   */
  temperature?: number;
}

// 服务层统一返回结构：要么得到通过 Zod 校验的数据，要么回传原始文本和错误信息。
export type GenerateResult =
  | { success: true; data: any }
  | { success: false; rawText: string; error: string };

/**
 * 调用指定模型生成结构化输出，并在服务层统一完成 schema 查找、校验与错误封装。
 */
export async function generateStructuredOutput(
  options: GenerateOptions
): Promise<GenerateResult> {
  const schema = schemas[options.schemaId];
  if (!schema) {
    return {
      success: false,
      rawText: '',
      error: `Unknown schemaId: ${options.schemaId}`,
    };
  }

  const jsonSchema = jsonSchemas[options.schemaId];
  const adapter = adapters[options.provider] || adapters.fallback;

  try {
    const { rawText } = await adapter({
      prompt: options.prompt,
      jsonSchema,
      model: options.model,
      temperature: options.temperature,
    });

    return parseWithFallback(rawText, schema);
  } catch (err: any) {
    return {
      success: false,
      rawText: '',
      error: `Adapter error: ${err.message}`,
    };
  }
}

/**
 * 先做弹性 JSON 提取，再用目标 schema 校验；任何一步失败都返回可展示的错误结果。
 */
function parseWithFallback(
  rawText: string,
  schema: z.ZodSchema
): GenerateResult {
  const extracted = resilientJsonExtract(rawText);

  if (extracted) {
    const parsed = schema.safeParse(extracted.json);
    if (parsed.success) {
      return { success: true, data: parsed.data };
    }
    return {
      success: false,
      rawText,
      error: `Schema validation failed: ${parsed.error.message}`,
    };
  }

  return {
    success: false,
    rawText,
    error: 'No valid JSON found in response',
  };
}
