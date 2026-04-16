/**
 * Chart 组件 Props 定义
 *
 * 用途：让 AI 返回可可视化的图表数据。
 * 适用场景：趋势分析、占比统计、对比数据等。
 *
 * 设计决策：
 * - 采用“轻量声明式”设计，只返回 type + labels + data。
 *   原因：我们不希望 AI 关心图表的颜色、坐标轴样式等视觉细节。
 *   这些应由前端 Chart.vue 组件根据 design system 统一渲染。
 * - labels 和 data 是并行数组，第 i 个 label 对应第 i 个 data 点。
 *
 * 对 AI 的提示：
 * - type 必须是 "bar" | "line" | "pie" 之一。
 * - labels 和 data 的长度必须一致。
 * - title 帮助用户快速理解图表表达的核心信息。
 */

import { z } from 'zod';

export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartProps {
  type: ChartType;
  title: string;
  labels: string[];
  data: number[];
}

export const ChartPropsSchema: z.ZodType<ChartProps> = z.object({
  type: z
    .enum(['bar', 'line', 'pie'])
    .describe('图表类型：bar=柱状图，line=折线图，pie=饼图'),
  title: z.string().describe('图表标题，概括数据主题'),
  labels: z
    .array(z.string())
    .describe('X轴标签或扇区名称，与 data 数组一一对应'),
  data: z
    .array(z.number())
    .describe('数值数组，每个数字对应 labels 中同下标的类别'),
});
