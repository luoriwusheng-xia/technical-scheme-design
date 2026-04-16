import OpenAI from 'openai';
import { env } from '../config/env.js';
import type { ModelAdapter } from './index.js';

let client: OpenAI | null = null;
function getClient() {
  if (!client) {
    if (!env.KIMI_API_KEY) {
      throw new Error(
        'Missing KIMI_API_KEY. Please set it in your environment or .env file.'
      );
    }
    client = new OpenAI({
      apiKey: env.KIMI_API_KEY,
      baseURL: 'https://api.moonshot.cn/v1',
    });
  }
  return client;
}

/**
 *
 * @link https://platform.kimi.com/docs/api/overview
 */
export const kimiAdapter: ModelAdapter = async (options) => {
  const response = await getClient().chat.completions.create({
    model: options.model || 'kimi-k2-5',
    messages: [{ role: 'user', content: options.prompt }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'structured_output',
        strict: true,
        schema: options.jsonSchema,
      },
    },
    temperature: options.temperature ?? 0.7,
  });

  return { rawText: response.choices[0]?.message?.content || '' };
};
