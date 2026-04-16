/**
 * Schema 注册表
 *
 * 用途：集中管理所有业务场景的 Zod Schema 及其对应的 JSON Schema 导出。
 *
 * 为什么需要注册表？
 * 1. 后端根据 schemaId 字符串快速查找对应的 Zod Schema 进行校验。
 * 2. 后端根据 schemaId 获取对应的 JSON Schema，传递给 OpenAI/Anthropic/Gemini 的原生 API。
 * 3. 前端虽然不直接使用注册表，但可以通过 `z.infer<typeof schemas['xxx']>` 获得类型。
 *
 * 新增业务场景的方法：
 * 1. 在 `src/schemas/` 下新建文件（如 `reportGenerator.ts`）。
 * 2. 导出该场景的 Zod Schema（顶层必须是 AIOutputSchema 兼容结构）。
 * 3. 在 `schemas` 对象中注册：`report-generator: ReportGeneratorSchema`。
 * 4. 在 `jsonSchemas` 对象中同步注册，使用 Zod v4 内置的 `toJSONSchema` 转换。
 */

import { toJSONSchema } from 'zod';
import { AIOutputSchema } from '../blocks/index.js';

/**
 * schemas：Zod Schema 字典
 *
 * key 是 schemaId（如 "ai-output"），也是前后端接口中传递的标识符。
 * value 是对应的 Zod Schema 对象。
 */
export const schemas = {
  'ai-output': AIOutputSchema,
} as const;

/**
 * SchemaId：所有注册 schema 的 ID 联合类型
 */
export type SchemaId = keyof typeof schemas;

/**
 * jsonSchemas：JSON Schema 字典
 *
 * 使用 Zod v4 内置的 `toJSONSchema` 将 Zod Schema 转换为标准 JSON Schema，
 * 供 OpenAI / Anthropic / Gemini 的原生 API 使用。
 */
export const jsonSchemas = {
  'ai-output': toJSONSchema(AIOutputSchema),
};
