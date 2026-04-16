/**
 * Block 架构核心定义
 *
 * 设计理念：
 * AI 返回的内容不再是单一的 JSON 对象，而是一个 "blocks" 数组。
 * 每个 block 代表页面上的一个独立渲染单元，可以是纯文本（markdown），
 * 也可以是结构化组件（component）。
 *
 * 这种设计的好处：
 * 1. 支持混合布局：AI 可以在文本中任意位置插入表格、图表、表单等组件。
 * 2. 扩展性好：新增组件类型时，只需在 ComponentBlockSchema 中增加分支。
 * 3. 对 AI 友好：数组结构语义清晰，模型容易理解 "先输出一段说明，再输出一个表格"。
 * 4. 前端渲染简单：遍历 blocks，根据 type 字段做条件渲染即可。
 *
 * 对 AI 的约束（需在 prompt 中强调）：
 * - 顶层必须是 { "blocks": [...] }
 * - 每个 block 必须有 "type" 字段，值为 "markdown" 或 "component"
 * - "markdown" block 用 "content" 承载文本
 * - "component" block 用 "component" + "props" 承载组件数据
 */

import { z } from 'zod';
import type { ComponentBlock } from '../components/index.js';
import { ComponentBlockSchema } from '../components/index.js';

/**
 * MarkdownBlock：纯文本/富文本块
 *
 * 用途：承载 AI 生成的自然语言内容，如解释、总结、引导语等。
 * 前端渲染：使用 markstream-vue 或 Markdown 组件渲染 content 字段。
 * AI 提示：当需要输出说明性文字时，使用 { type: "markdown", content: "..." }
 */
export interface MarkdownBlock {
  type: 'markdown';
  content: string;
}

export const MarkdownBlockSchema: z.ZodType<MarkdownBlock> = z.object({
  type: z.literal('markdown'),
  content: z.string().describe('Markdown 格式的文本内容，支持段落、列表、代码块等'),
});

export type Block = MarkdownBlock | ComponentBlock;

export interface AIOutput {
  blocks: Block[];
}

/**
 * Block：所有可能 block 类型的联合
 *
 * 目前支持：MarkdownBlock | ComponentBlock
 * 前端通过 discriminatedUnion（以 type 为区分字段）实现类型安全的条件渲染。
 */
export const BlockSchema = z.union([MarkdownBlockSchema, ComponentBlockSchema]);

/**
 * AIOutputSchema：AI 结构化输出的顶层 Schema
 *
 * 这是所有 provider（OpenAI/Anthropic/Gemini/Fallback）最终都要符合的格式。
 * blocks 数组保证页面内容按顺序渲染。
 *
 * 示例：
 * {
 *   "blocks": [
 *     { "type": "markdown", "content": "以下是分析结果：" },
 *     { "type": "component", "component": "DataTable", "props": { ... } },
 *     { "type": "markdown", "content": "如需进一步了解，请填写表单。" },
 *     { "type": "component", "component": "Form", "props": { ... } }
 *   ]
 * }
 */
export const AIOutputSchema: z.ZodType<AIOutput> = z.object({
  blocks: z.array(BlockSchema).describe('页面内容块数组，按顺序渲染'),
});
