/**
 * 组件白名单定义
 *
 * 核心理念：
 * AI 不能返回任意的组件名称。前端只认可 ComponentTypeSchema 中枚举的值。
 * 这是一种安全边界：防止 AI 返回未知组件导致前端渲染错误或 XSS 风险。
 *
 * 扩展方式：
 * 1. 在 ComponentTypeSchema 的 z.enum() 中增加新组件名
 * 2. 在同目录下新建对应的 Props Schema 文件（如 Timeline.ts）
 * 3. 在 ComponentBlockSchema 的 discriminatedUnion 中增加对应分支
 * 4. 前端实现对应的 .vue 组件，并在 componentMap 中注册
 */

import { z } from 'zod';
import type { ChartProps } from './Chart.js';
import { ChartPropsSchema } from './Chart.js';
import type { DataTableProps } from './DataTable.js';
import { DataTablePropsSchema } from './DataTable.js';
import type { FormProps } from './Form.js';
import { FormPropsSchema } from './Form.js';

/**
 * ComponentTypeSchema：前端允许渲染的组件白名单
 *
 * 当前支持：
 * - DataTable：二维表格展示
 * - Chart：柱状图/折线图/饼图
 * - Form：输入表单
 *
 * AI 返回的 component 字段必须是其中之一，否则 Zod 校验会失败。
 */
export const ComponentTypeSchema = z.enum([
  'DataTable',
  'Chart',
  'Form',
]);

export type ComponentType = 'DataTable' | 'Chart' | 'Form';

export type ComponentBlock =
  | {
      type: 'component';
      component: 'DataTable';
      props: DataTableProps;
    }
  | {
      type: 'component';
      component: 'Chart';
      props: ChartProps;
    }
  | {
      type: 'component';
      component: 'Form';
      props: FormProps;
    };

/**
 * ComponentBlockSchema：组件型 block 的联合类型
 *
 * 使用 discriminatedUnion（以 component 字段区分），确保 TypeScript 能精确推断每个分支的 props 类型。
 * 例如：当 component === 'DataTable' 时，props 自动推断为 DataTableProps。
 */
export const ComponentBlockSchema = z.discriminatedUnion('component', [
  z.object({
    type: z.literal('component').describe('固定为 "component"，表示这是一个 UI 组件块'),
    component: z.literal('DataTable').describe('渲染 DataTable 组件'),
    props: DataTablePropsSchema,
  }),
  z.object({
    type: z.literal('component').describe('固定为 "component"，表示这是一个 UI 组件块'),
    component: z.literal('Chart').describe('渲染 Chart 组件'),
    props: ChartPropsSchema,
  }),
  z.object({
    type: z.literal('component').describe('固定为 "component"，表示这是一个 UI 组件块'),
    component: z.literal('Form').describe('渲染 Form 组件'),
    props: FormPropsSchema,
  }),
]);

export * from './DataTable.js';
export * from './Chart.js';
export * from './Form.js';
