import OpenAI from 'openai';
import { env } from '../config/env.js';
import type { ModelAdapter } from './index.js';

let client: OpenAI | null = null;
function getClient() {
  if (!client) {
    if (!env.OPENAI_API_KEY) {
      throw new Error(
        'Missing OPENAI_API_KEY. Please set it in your environment or .env file.'
      );
    }
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

export const openaiAdapter: ModelAdapter = async (options) => {
  const response = await getClient().chat.completions.create({
    model: options.model || 'gpt-4o',
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
