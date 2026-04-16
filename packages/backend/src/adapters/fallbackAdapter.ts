import { env } from '../config/env.js';
import type { ModelAdapter } from './index.js';

async function callGenericLLM(_options: {
  model?: string;
  messages: { role: string; content: string }[];
  temperature: number;
}): Promise<{ text: string }> {
  // TODO: 替换为实际的通用 LLM 调用（如 DeepSeek、Ollama、国产模型等）
  // 可通过 env.FALLBACK_BASE_URL 和 env.FALLBACK_API_KEY 构造请求
  throw new Error(
    'fallbackAdapter is not fully implemented. Please provide a generic LLM client.'
  );
}

export const fallbackAdapter: ModelAdapter = async (options) => {
  const systemPrompt = `
You must respond with valid JSON that conforms exactly to the following schema:
${JSON.stringify(options.jsonSchema, null, 2)}

Rules:
1. The top-level object must contain a "blocks" array.
2. Each block must have a "type" field: either "markdown" or "component".
3. For text content, use { "type": "markdown", "content": "..." }.
4. For UI components, use { "type": "component", "component": "DataTable|Chart|Form", "props": { ... } }.
5. Do not wrap the JSON in markdown code blocks.
6. Do not include any explanatory text outside the JSON.
7. Ensure all required fields are present.
`.trim();

  const response = await callGenericLLM({
    model: options.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: options.prompt },
    ],
    temperature: options.temperature ?? 0.7,
  });

  return { rawText: response.text };
};
