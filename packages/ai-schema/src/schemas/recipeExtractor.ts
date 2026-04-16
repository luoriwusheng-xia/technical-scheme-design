/**
 * RecipeExtractorSchema：食谱提取业务场景示例
 *
 * 用途：演示如何让 AI 从一段自然语言文本中提取结构化食谱数据，
 *       并以 Block-based 格式返回（文本说明 + DataTable 组件）。
 *
 * 设计思路：
 * 1. 先定义食谱的核心数据模型（RecipeDataSchema）：菜名、准备时间、配料、步骤。
 * 2. 再定义外层 Block 数组结构，让 AI 可以灵活组合 markdown 和 component。
 *    例如：先输出一段介绍文字（markdown），再展示配料表（DataTable）。
 *
 * 为什么用 DataTable 展示配料？
 * - 配料天然是表格结构（名称 + 用量），表格比纯文本更直观。
 * - 通过 columns/rows 分离，前端可以直接用 DataTable.vue 渲染，无需额外解析。
 *
 * AI 使用提示：
 * - 如果用户输入的是完整食谱文本，提取关键信息并按 blocks 格式返回。
 * - 如果信息不完整，可以在 markdown block 中说明缺失了哪些内容。
 * - 配料 rows 中建议有两列：name（名称）和 quantity（用量）。
 */

import { z } from 'zod';

const RecipeDataSchema = z.object({
  recipe_name: z.string().describe('食谱名称，如 "巧克力曲奇"'),
  prep_time_minutes: z.number().optional().describe('准备时间（分钟），可选'),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe('配料名称，如 "面粉"'),
        quantity: z.string().describe('用量，如 "2 又 1/4 杯"'),
      })
    )
    .describe('配料清单'),
  instructions: z
    .array(z.string())
    .describe('烹饪步骤，每一步是一个字符串'),
});

export const RecipeExtractorSchema = z.object({
  blocks: z.array(
    z.union([
      z.object({
        type: z.literal('markdown'),
        content: z.string().describe('食谱说明文字、引言或补充信息'),
      }),
      z.object({
        type: z.literal('component'),
        component: z.literal('DataTable'),
        props: z.object({
          title: z.string().describe('表格标题'),
          columns: z
            .array(z.object({ key: z.string(), title: z.string() }))
            .describe('列定义'),
          rows: z
            .array(z.record(z.string(), z.any()))
            .describe('表格数据行'),
        }),
      }),
    ])
  ),
});
