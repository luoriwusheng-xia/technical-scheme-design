export interface AdapterOptions {
  prompt: string;
  jsonSchema: any;
  model?: string;
  temperature?: number;
}

export interface AdapterResult {
  rawText: string;
}

export type ModelAdapter = (options: AdapterOptions) => Promise<AdapterResult>;

export { openaiAdapter } from './openaiAdapter.js';
export { anthropicAdapter } from './anthropicAdapter.js';
export { geminiAdapter } from './geminiAdapter.js';
export { kimiAdapter } from './kimiAdapter.js';
export { fallbackAdapter } from './fallbackAdapter.js';
