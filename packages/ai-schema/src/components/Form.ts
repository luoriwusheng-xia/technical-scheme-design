/**
 * Form 组件 Props 定义
 *
 * 用途：让 AI 动态生成输入表单，引导用户补充信息或提交数据。
 * 适用场景：问卷调查、信息收集、参数配置、预约登记等。
 *
 * 设计决策：
 * - 字段类型限制在常见输入类型（text/number/email/select/textarea）。
 *   原因：覆盖 90% 的表单需求，同时避免 AI 返回前端不支持的特殊控件。
 * - options 只对 select 类型有效，其他类型可忽略。
 * - required 是可选的，让 AI 能区分必填和选填字段。
 *
 * 对 AI 的提示：
 * - name 字段必须是英文标识符，用于表单提交时的 key。
 * - label 是面向用户的显示名称，应简洁明了。
 * - 当 type 为 "select" 时，必须提供 options 数组。
 */

import { z } from 'zod';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'select' | 'textarea';
  required?: boolean;
  options?: string[];
}

export interface FormProps {
  title: string;
  fields: FormField[];
  submitLabel?: string;
}

export const FormFieldSchema: z.ZodType<FormField> = z.object({
  name: z.string().describe('字段标识符，表单提交时使用的 key，建议使用英文'),
  label: z.string().describe('字段显示标签，面向用户的可读名称'),
  type: z
    .enum(['text', 'number', 'email', 'select', 'textarea'])
    .describe('输入控件类型'),
  required: z
    .boolean()
    .optional()
    .describe('是否必填，true 时前端会加红色星标并做必填校验'),
  options: z
    .array(z.string())
    .optional()
    .describe('当 type="select" 时的下拉选项列表，其他类型可忽略'),
});

export const FormPropsSchema: z.ZodType<FormProps> = z.object({
  title: z.string().describe('表单标题，说明收集信息的目的'),
  fields: z
    .array(FormFieldSchema)
    .describe('表单字段定义数组，决定表单包含哪些输入项'),
  submitLabel: z
    .string()
    .optional()
    .describe('提交按钮文字，默认显示 "Submit"'),
});
