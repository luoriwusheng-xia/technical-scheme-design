import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import type { ModelAdapter } from './index.js';

let client: Anthropic | null = null;
function getClient() {
  if (!client) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error(
        'Missing ANTHROPIC_API_KEY. Please set it in your environment or .env file.'
      );
    }
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const anthropicAdapter: ModelAdapter = async (options) => {
  const message = await getClient().messages.create({
    model: options.model || 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{ role: 'user', content: options.prompt }],
    tools: [
      {
        name: 'extract_data',
        description: 'Extract structured data according to the provided JSON schema.',
        input_schema: options.jsonSchema,
      },
    ],
    tool_choice: { type: 'tool', name: 'extract_data' },
  });

  const toolUse = message.content.find(
    (c): c is Anthropic.Messages.ToolUseBlock => c.type === 'tool_use'
  );

  if (!toolUse) {
    throw new Error('Anthropic did not return a tool_use block');
  }

  return { rawText: JSON.stringify(toolUse.input) };
};
