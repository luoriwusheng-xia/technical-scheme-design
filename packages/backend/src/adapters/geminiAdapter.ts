import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import type { ModelAdapter } from './index.js';

let client: GoogleGenAI | null = null;
function getClient() {
  if (!client) {
    if (!env.GEMINI_API_KEY) {
      throw new Error(
        'Missing GEMINI_API_KEY. Please set it in your environment or .env file.'
      );
    }
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

export const geminiAdapter: ModelAdapter = async (options) => {
  const response = await getClient().models.generateContent({
    model: options.model || 'gemini-2.0-flash',
    contents: options.prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: options.jsonSchema,
      temperature: options.temperature ?? 0.7,
    },
  });

  return { rawText: response.text || '' };
};
