/**
 * @aiblocks/ai-schema 统一导出入口
 *
 * 这是前后端共享包的唯一公开接口。业务代码应始终从此文件导入，
 * 避免直接引用内部子目录，以便未来重构时保持兼容。
 *
 * 导出内容分为三大类：
 * 1. blocks：Block / MarkdownBlock / ComponentBlock / AIOutputSchema（顶层输出结构）
 * 2. components：ComponentType / DataTableProps / ChartProps / FormProps 等
 * 3. schemas：SchemaId / schemas / jsonSchemas（注册表）
 *
 * 使用示例：
 *   import { AIOutputSchema, type Block, type DataTableProps, schemas } from '@aiblocks/ai-schema';
 */

export * from './blocks/index.js';
export * from './components/index.js';
export * from './schemas/index.js';
