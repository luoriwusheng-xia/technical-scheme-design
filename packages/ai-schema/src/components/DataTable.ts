/**
 * DataTable 组件 Props 定义
 *
 * 用途：让 AI 以结构化表格的形式返回数据。
 * 适用场景：列表对比、实验结果、食谱配料、排行榜等。
 *
 * 设计决策：
 * - columns 和 rows 分离，而不是直接返回二维数组。
 *   原因：columns 定义了表头名称和 key 的映射，前端不需要自己推断表头。
 * - rows 是对象数组（Record<string, any>[]），而不是固定字段的对象数组。
 *   原因：表格列是动态的，AI 可能返回 3 列也可能返回 10 列，用 Record 更灵活。
 *
 * 对 AI 的提示：
 * - columns 必须与 rows 中的 key 一致，否则前端某些列会显示为空。
 * - title 是可选的摘要性标题，帮助用户理解表格主题。
 */

import { z } from 'zod';

export interface DataTableColumn {
  key: string;
  title: string;
}

export interface DataTableProps {
  title: string;
  columns: DataTableColumn[];
  rows: Record<string, any>[];
}

export const DataTableColumnSchema: z.ZodType<DataTableColumn> = z.object({
  key: z.string().describe('列的唯一标识符，必须与 rows 中对象的 key 一致'),
  title: z.string().describe('表头显示名称，面向用户的可读标题'),
});

export const DataTablePropsSchema: z.ZodType<DataTableProps> = z.object({
  title: z.string().describe('表格标题，简述表格内容主题'),
  columns: z
    .array(DataTableColumnSchema)
    .describe('列定义数组，决定表格有几列以及每列的显示名称'),
  rows: z
    .array(z.record(z.string(), z.any()))
    .describe(
      '表格数据行，每行是一个对象，key 对应 columns 中的 key，value 为单元格内容'
    ),
});
