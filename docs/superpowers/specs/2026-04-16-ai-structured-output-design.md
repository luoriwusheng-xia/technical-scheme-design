# AI 结构化输出设计方案

> 日期：2026-04-16
> 目标：构建跨模型通用、前后端类型安全、可维护的 AI 结构化输出体系，支撑前端根据 AI 返回数据动态渲染不同 UI 组件。

---

## 1. 背景与目标

### 1.1 问题背景
后端调用不同 AI 模型时，各平台对结构化输出（Structured Output / JSON Schema）的支持能力差异很大：
- OpenAI 原生支持 `response_format.json_schema`，可保证 100% 合法 JSON。
- Anthropic 没有独立的 json_schema response_format，需通过 `tool use` 强制输出。
- Gemini 通过 `generationConfig.responseJsonSchema` 约束。
- 国产/本地小模型（DeepSeek、通义、Ollama 等）无原生支持，只能靠 prompt 约束。

### 1.2 设计目标
1. **通用性**：业务代码不感知底层模型差异，换模型只需改配置。
2. **类型安全**：前后端共享同一套领域类型与 Zod Schema，端到端类型安全。
3. **可维护性**：后端 Adapter 按模型拆分文件，独立维护。
4. **健壮性**：强模型走原生能力，弱模型 prompt 兜底，失败时返回纯文本供前端展示。
5. **严格组件映射**：前端只渲染白名单内的组件，禁止动态执行任意代码。

---

## 2. 技术方案选型

### 2.1 最终方案：Schema-First Monorepo + BFF Adapter

- **共享层**：`packages/ai-schema` 定义所有 Zod Schema 与组件白名单类型。
- **后端**：Node.js + Express，封装 `StructuredOutputService`，内部按模型拆分 Adapter 文件。
- **前端**：Vue3 + TypeScript，通过 `componentRegistry` 严格枚举映射组件。

### 2.2 未选方案说明
| 方案 | 未选原因 |
|------|---------|
| 纯 Prompt + JSON Schema 校验 | 小模型失败率过高，不适合核心链路 |
| Vercel AI SDK / Edge Gateway | 与当前 Node/Express 后端栈耦合过深，通用性不足 |
| 动态组件协议 / 低代码配置 | 架构过重，类型安全难以保证，超出当前阶段需求 |

---

## 3. 整体架构与数据流

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Vue3 + TS)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ useAIGenerate│─▶│ Component    │─▶│ UI Rendering    │   │
│  │ (composable) │  │ Registry     │  │ (严格枚举映射)   │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ POST /api/ai/generate
┌───────────────────────────▼─────────────────────────────────┐
│              Backend Adapter (Node + Express)               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  StructuredOutputService                            │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │   │
│  │  │ Provider   │─▶│ Zod 校验    │─▶│ Fallback     │  │   │
│  │  │ Router     │  │ (ai-schema)│  │ Handler      │  │   │
│  │  └────────────┘  └────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐       ┌──────────┐       ┌──────────┐
   │ OpenAI  │       │ Anthropic│       │ Gemini   │
   │ (native)│       │ (tool)   │       │ (native) │
   └─────────┘       └──────────┘       └──────────┘
        ▼                   ▼                   ▼
   ┌─────────┐       ┌──────────┐       ┌──────────┐
   │DeepSeek │◄──────┘ 其他模型  └──────►│ 本地模型  │
   │(prompt) │       │(prompt)  │       │(prompt)  │
   └─────────┘       └──────────┘       └──────────┘
```

![1](../../../模型对接图.png)

### 3.1 核心数据流
1. 前端发送 `{ provider, schemaId, prompt, model?, temperature? }` 到 `/api/ai/generate`。
2. `StructuredOutputService` 根据 `provider` 选择对应的模型 Adapter 文件。
3. Adapter 调用 AI API，返回原始文本/JSON。
4. `parseAndValidate` 用 `ai-schema` 中的 Zod Schema 做统一校验。
5. 校验通过 → 返回 `{ success: true, data: { blocks: [...] } }`。
6. 校验失败 → 走弹性提取，仍失败 → 返回 `{ success: false, rawText: ... }`。
7. 前端 `success: true` 时遍历 `blocks` 数组，每个 block 按 `type` 路由：`markdown` 走 Markdown 组件，`component` 走 `componentRegistry` 严格枚举映射；`success: false` 时用单个 `Markdown` 组件展示原始文本。

---

## 4. Adapter 层设计（Node + Express）

### 4.1 目录结构
按模型拆分文件，一个文件只负责一个模型的调用与原始响应返回：

```
packages/backend/
├── src/adapters/
│   ├── index.ts              # 统一导出 + provider 路由
│   ├── openaiAdapter.ts      # OpenAI Chat Completions / Responses
│   ├── anthropicAdapter.ts   # Anthropic Tool Use
│   ├── geminiAdapter.ts      # Gemini GenerateContent
│   ├── kimiAdapter.ts        # Kimi (Moonshot) OpenAI-compatible API
│   └── fallbackAdapter.ts    # Prompt + 原始返回（DeepSeek/国产/本地）
├── src/config/
│   └── env.ts                # 环境变量收敛封装
├── src/services/
│   └── structuredOutput.ts   # 统一入口：路由 → Adapter → 校验 → Fallback
├── src/utils/
│   └── resilientParse.ts     # 弹性 JSON 提取器
└── src/routes/
    └── ai.ts                 # Express Route
```

### 4.2 Adapter 接口契约
所有 Adapter 必须实现同一接口：

```typescript
// adapters/index.ts
import { z } from 'zod';

export interface AdapterOptions {
  prompt: string;
  jsonSchema: any;      // 传给模型原生 API 的 JSON Schema
  model?: string;
  temperature?: number;
}

export interface AdapterResult {
  rawText: string;      // 原始响应文本，供后续提取/校验
}

export type ModelAdapter = (options: AdapterOptions) => Promise<AdapterResult>;

export const adapters: Record<string, ModelAdapter> = {
  openai: require('./openaiAdapter').openaiAdapter,
  anthropic: require('./anthropicAdapter').anthropicAdapter,
  gemini: require('./geminiAdapter').geminiAdapter,
  kimi: require('./kimiAdapter').kimiAdapter,
  fallback: require('./fallbackAdapter').fallbackAdapter,
};
```

### 4.3 Adapter 职责边界
- **只做一件事**：把 `prompt + jsonSchema` 发给对应模型，返回原始文本。
- **不做校验**：Zod 校验交给上层的 `structuredOutput.ts`，保证逻辑统一。
- **不做重试**：重试/降级策略也交给上层，Adapter 保持最小化。

### 4.4 示例：openaiAdapter.ts
```typescript
import OpenAI from 'openai';
import { env } from '../config/env.js';
import type { ModelAdapter } from './index.js';

let client: OpenAI | null = null;
function getClient() {
  if (!client) {
    if (!env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

export const openaiAdapter: ModelAdapter = async (options) => {
  const response = await getClient().chat.completions.create({
    model: options.model || 'gpt-4o',
    messages: [{ role: 'user', content: options.prompt }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'structured_output',
        strict: true,
        schema: options.jsonSchema,
      },
    },
    temperature: options.temperature ?? 0.7,
  });

  return { rawText: response.choices[0]?.message?.content || '' };
};
```

### 4.5 示例：anthropicAdapter.ts
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import type { ModelAdapter } from './index.js';

let client: Anthropic | null = null;
function getClient() {
  if (!client) {
    if (!env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY');
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
```

### 4.6 示例：kimiAdapter.ts
```typescript
import OpenAI from 'openai';
import { env } from '../config/env.js';
import type { ModelAdapter } from './index.js';

let client: OpenAI | null = null;
function getClient() {
  if (!client) {
    if (!env.KIMI_API_KEY) throw new Error('Missing KIMI_API_KEY');
    client = new OpenAI({
      apiKey: env.KIMI_API_KEY,
      baseURL: 'https://api.moonshot.cn/v1',
    });
  }
  return client;
}

export const kimiAdapter: ModelAdapter = async (options) => {
  const response = await getClient().chat.completions.create({
    model: options.model || 'kimi-k2-5',
    messages: [{ role: 'user', content: options.prompt }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'structured_output',
        strict: true,
        schema: options.jsonSchema,
      },
    },
    temperature: options.temperature ?? 0.7,
  });

  return { rawText: response.choices[0]?.message?.content || '' };
};
```

### 4.7 示例：fallbackAdapter.ts
```typescript
import { env } from '../config/env.js';
import type { ModelAdapter } from './index.js';

export const fallbackAdapter: ModelAdapter = async (options) => {
  // 这里用任意 HTTP client 调用目标模型
  // 如 DeepSeek、Ollama、国产模型等
  // 可通过 env.FALLBACK_BASE_URL 和 env.FALLBACK_API_KEY 构造请求
  const systemPrompt = `
You must respond with valid JSON that conforms exactly to the following schema:
${JSON.stringify(options.jsonSchema, null, 2)}

Rules:
1. The top-level object must contain a "blocks" array.
2. Each block must have a "type" field: either "markdown" or "component".
3. For text content, use { "type": "markdown", "content": "..." }.
4. For UI components, use { "type": "component", "component": "DataTable|Chart|Form", "props": { ... } }.
5. Do not wrap the JSON in markdown code blocks.
6. Do not include any explanatory text outside the JSON.
7. Ensure all required fields are present.
`.trim();

  const response = await callGenericLLM({
    model: options.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: options.prompt },
    ],
    temperature: options.temperature ?? 0.7,
  });

  return { rawText: response.text };
};
```

---

## 4.8 环境变量配置（Node 24 原生 `--env-file`）

### 设计原则
- **不引入 `dotenv` 依赖**：Node.js 24 已原生支持 `--env-file` 参数，无需第三方库。
- **环境文件按环境分离**：`.env.development` 用于开发，`.env.production` 用于生产，`.env` 作为通用模板。
- **禁止直接访问 `process.env`**：所有环境变量统一收敛到 `src/config/env.ts`，方便查找、替换和后续扩展。

### 文件结构
```
packages/backend/
├── .env                      # 通用模板（仅作示例，不提交到 git）
├── .env.development          # 开发环境变量
├── .env.production           # 生产环境变量
└── src/config/env.ts         # 收敛封装
```

### package.json scripts
```json
{
  "scripts": {
    "dev": "tsx --env-file=.env.development --watch src/index.ts",
    "build": "tsc",
    "start": "node --env-file=.env.production dist/index.js"
  }
}
```

### env.ts 示例
```typescript
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  KIMI_API_KEY: process.env.KIMI_API_KEY,

  FALLBACK_BASE_URL: process.env.FALLBACK_BASE_URL,
  FALLBACK_API_KEY: process.env.FALLBACK_API_KEY,
};
```

### 安全提示
`.env`、`.env.development`、`.env.production` 必须加入 `.gitignore`，防止 API Key 泄露。

---

## 5. Schema 定义规范与组件白名单

### 5.1 共享包结构
```
packages/ai-schema/
├── src/
│   ├── components/
│   │   ├── index.ts
│   │   ├── DataTable.ts
│   │   ├── Chart.ts
│   │   └── Form.ts
│   ├── blocks/
│   │   ├── index.ts          # Block 联合类型定义
│   │   └── markdownBlock.ts
│   ├── schemas/
│   │   ├── index.ts
│   │   └── recipeExtractor.ts
│   └── index.ts
```

共享包对外同时暴露两类能力：
- **显式 TypeScript 类型**：供 Vue `defineProps<T>()`、业务层类型约束、联合类型推断直接使用。
- **Zod Schema**：供后端结构化输出校验、JSON Schema 派生、运行时兜底校验使用。

包入口需显式声明 `exports` 与 `types`，确保 monorepo workspace 在 `moduleResolution: "bundler"` / `nodenext` 下都能稳定解析：

```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

### 5.2 Block-based 输出结构
AI 返回的是一个 `blocks` 数组，每个元素要么是 `markdown` 文本块，要么是 `component` 组件块。这样可自由组合“文本 + 组件 + 文本”的混合布局。

```typescript
// src/components/Form.ts
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
  name: z.string(),
  label: z.string(),
  type: z.enum(['text', 'number', 'email', 'select', 'textarea']),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

export const FormPropsSchema: z.ZodType<FormProps> = z.object({
  title: z.string(),
  fields: z.array(FormFieldSchema),
  submitLabel: z.string().optional(),
});
```

```typescript
// src/components/index.ts
import { z } from 'zod';
import { DataTablePropsSchema } from './DataTable';
import { ChartPropsSchema } from './Chart';
import { FormPropsSchema } from './Form';

export const ComponentTypeSchema = z.enum([
  'DataTable',
  'Chart',
  'Form',
]);

export type ComponentType = 'DataTable' | 'Chart' | 'Form';

export type ComponentBlock =
  | { type: 'component'; component: 'DataTable'; props: DataTableProps }
  | { type: 'component'; component: 'Chart'; props: ChartProps }
  | { type: 'component'; component: 'Form'; props: FormProps };

// 组件 Block
export const ComponentBlockSchema = z.discriminatedUnion('component', [
  z.object({
    type: z.literal('component'),
    component: z.literal('DataTable'),
    props: DataTablePropsSchema,
  }),
  z.object({
    type: z.literal('component'),
    component: z.literal('Chart'),
    props: ChartPropsSchema,
  }),
  z.object({
    type: z.literal('component'),
    component: z.literal('Form'),
    props: FormPropsSchema,
  }),
]);
```

```typescript
// src/blocks/index.ts
import { z } from 'zod';
import { ComponentBlockSchema } from '../components';

export interface MarkdownBlock {
  type: 'markdown';
  content: string;
}

export type Block = MarkdownBlock | ComponentBlock;

export interface AIOutput {
  blocks: Block[];
}

export const MarkdownBlockSchema: z.ZodType<MarkdownBlock> = z.object({
  type: z.literal('markdown'),
  content: z.string(),
});

export const BlockSchema = z.union([MarkdownBlockSchema, ComponentBlockSchema]);

// AI 最终输出
export const AIOutputSchema: z.ZodType<AIOutput> = z.object({
  blocks: z.array(BlockSchema),
});
```

### 5.3 Vue SFC 兼容性约束
在 Vue 3.3+ 中，`defineProps<T>()` 已支持导入外部类型，但 Vue SFC 编译器对类型转运行时 props 的分析仍是 **AST-based**，并不是完整的 TypeScript 类型求值。

这带来一个实际约束：
- `defineProps<FormProps>()` 可以直接消费外部包导出的普通 `interface` / type literal。
- `defineProps<z.infer<typeof FormPropsSchema>>()` 这类跨包导出的推导类型，在 `.d.ts` 中通常会保留为 `z.infer<typeof ...>`，Vue SFC 编译器常会报 `Unresolvable type reference or unsupported built-in utility type`。

因此本方案规定：
1. `packages/ai-schema` 中所有会被前端 Vue SFC 直接消费的类型，必须以显式 `interface` / type alias 形式导出。
2. Zod Schema 必须反向使用 `z.ZodType<T>` 约束这些显式类型，而不是让前端依赖 `z.infer` 作为公开类型入口。
3. `z.infer` 仍可用于后端内部类型推导或测试，但不作为 Vue SFC 宏的主要输入类型。

这项约束适用于：
- `FormProps`
- `DataTableProps`
- `ChartProps`
- `Block`
- `AIOutput`

### 5.4 Schema 设计原则
| 原则 | 说明 |
|------|------|
| 避免深层嵌套 | 超过 3 层对象解析失败率显著上升 |
| 少用 `anyOf`/`oneOf` | OpenAI Structured Outputs 支持有限 |
| 字段必须有 `description` | 提升 AI 填对字段的概率 |
| `required` 完整 | 核心信息不依赖 optional |
| 组件与数据分离 | `component` 管 UI，`props` 管数据 |
| 混合布局用 Block 数组 | `blocks` 数组支持文本与组件自由穿插 |
| Prompt 明确说明 Block 类型 | 需告诉 AI `type: "markdown"` 和 `type: "component"` 的用法 |
| Vue 直接消费的类型显式导出 | 避免跨包 `z.infer` 进入 `defineProps<T>()` 时被 SFC 编译器拒绝 |

---

## 6. Fallback / 错误降级流程

### 6.1 三层防线
1. **Prompt 预防**：system prompt 中嵌入完整 schema + 示例 + 输出规则。
2. **弹性提取**：按顺序尝试直接 parse → markdown code block 提取 → 正则提取第一个 `{...}` 或 `[...]`。
3. **安全兜底**：完全提取失败时，返回 `rawText`，前端用 `Markdown` 组件展示。

### 6.2 弹性提取器
```typescript
/**
 * 弹性 JSON 提取器
 *
 * 用途：从 AI 模型返回的原始文本中，尽最大努力提取出合法的 JSON 对象/数组。
 *
 * 设计背景：
 * - 强模型（OpenAI/Anthropic/Gemini/Kimi）的原生结构化输出通常已是干净 JSON，可直接 parse。
 * - 但 fallback 模型（国产、本地、小模型）经常会在 JSON 外面包裹 markdown 代码块，
 *   或在 JSON 前后添加解释性文字，导致直接 `JSON.parse()` 失败。
 * - 本方法通过三层渐进式提取策略，在不引入 LLM repair 的前提下，提升 fallback 路径的解析成功率。
 *
 * 提取策略（按顺序执行，成功即返回）：
 * 1. 直接 parse：尝试将完整 raw 文本当作 JSON 解析。
 * 2. Markdown code block 提取：用正则匹配 ```json ... ``` 或 ``` ... ``` 包裹的内容，再 parse。
 * 3. 正则硬提取：匹配第一个 `{...}` 或 `[...]` 文本块，再 parse。
 *
 * 各层 trade-off：
 * - 第一层最快最准，覆盖 90% 以上的强模型场景。
 * - 第二层处理模型“画蛇添足”加 markdown 包裹的情况。
 * - 第三层是最后一根救命稻草，适用于 JSON 被埋在长文本中的情况；
 *   但正则粗暴（取第一个 `{` 到最后一个 `}`），对于嵌套深或字符串含特殊字符的 JSON，
 *   可能出现截断或多吞内容，导致 parse 仍失败。
 */
export function resilientJsonExtract(raw: string): { json: any } | null {
  // Layer 1: 原始文本直接就是合法 JSON
  try {
    return { json: JSON.parse(raw) };
  } catch {}

  // Layer 2: 提取 markdown json code block
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return { json: JSON.parse(codeBlockMatch[1]) };
    } catch {}
  }

  // Layer 3: 正则硬提取第一个完整的对象或数组
  // 注意：这是 fallback 的最后一道防线，对于复杂嵌套 JSON 可能截断
  const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return { json: JSON.parse(jsonMatch[1]) };
    } catch {}
  }

  return null;
}
```

### 6.3 校验与降级逻辑
```typescript
export async function parseWithFallback(
  rawText: string,
  schema: z.ZodSchema
) {
  const extracted = resilientJsonExtract(rawText);

  if (extracted) {
    const parsed = schema.safeParse(extracted.json);
    if (parsed.success) {
      return { success: true, data: parsed.data };
    }
    return {
      success: false,
      rawText,
      error: `Schema validation failed: ${parsed.error.message}`,
    };
  }

  return {
    success: false,
    rawText,
    error: 'No valid JSON found in response',
  };
}
```

### 6.4 前端 Block 渲染
```vue
<!-- AIRenderer.vue -->
<script setup lang="ts">
import type { Block } from '@aiblocks/ai-schema';
import DataTable from './DataTable.vue';
import Chart from './Chart.vue';
import Form from './Form.vue';
// 推荐 markstream-vue 作为 Markdown 渲染引擎
import { MarkStream } from 'markstream-vue';

const props = defineProps<{
  blocks: Block[];
}>();

const componentMap = {
  DataTable,
  Chart,
  Form,
} as const;
</script>

<template>
  <div class="ai-content">
    <template v-for="(block, index) in blocks" :key="index">
      <MarkStream v-if="block.type === 'markdown'" :content="block.content" />
      <component
        v-else-if="block.type === 'component'"
        :is="componentMap[block.component]"
        v-bind="block.props"
      />
    </template>
  </div>
</template>
```

**推荐 `markstream-vue` 的原因：**
- 专为 AI 流式输出设计，支持增量渲染、无闪烁
- 支持 Mermaid 渐进式渲染、代码块 Monaco/Shiki 增量高亮
- 支持在 Markdown 中嵌入自定义 Vue 组件
- 社区有 Vue 2 / React 对应版本，生态完整

兜底渲染：
```vue
<template>
  <AIRenderer v-if="result.success" :blocks="result.data.blocks" />
  <MarkStream v-else :content="result.rawText" />
</template>
```

### 6.5 流式策略
本架构采用**后端攒完整 JSON、再一次性返回**的流式策略（方案 A）：
- 后端到 AI 服务器走 `stream=true`，边收边在内存中拼接完整响应。
- JSON 结构完整并通过 Zod 校验后，才通过 HTTP Response 返回给前端。
- 前端在等待期间，可用 `markstream-vue` 配合一个「正在输入…」的占位动画，营造流式感。

**不采用 token 级真流式的原因：**
- OpenAI `json_schema`、Anthropic `tool use`、Gemini `responseJsonSchema` 均只保证**最终输出**合法。
- 中间 token 经常是不完整 JSON，增量解析可靠性低，不适合生产环境。
- 后端攒完再一次性返回 block 数组，能确保前端每个 block 都是完整可渲染的。

---

## 7. 主流平台 response_format 对照清单

| 平台 | API | Schema 参数位置 | 强制开关 | 语法保证 |
|------|-----|----------------|---------|---------|
| **OpenAI (Chat)** | `/v1/chat/completions` | `response_format.json_schema.schema` | `strict: true` | 100% |
| **OpenAI (Responses)** | `/v1/responses` | `text.format.schema` | `strict: true` | 100% |
| **Anthropic** | `/v1/messages` | `tools[].input_schema` | `tool_choice.type: "tool"` | 100% |
| **Gemini** | `generateContent` | `generationConfig.responseJsonSchema` | `responseMimeType: "application/json"` | 高 |
| **Kimi** | `/v1/chat/completions` | `response_format.json_schema.schema` | `strict: true` | 100% |
| **Fallback** | 任意 | Prompt 文本嵌入 | 无 | 无 |

### 7.1 Anthropic Tool Use 关键说明
Anthropic 没有 `json_schema` response_format，官方推荐通过以下方式实现结构化输出：
1. 定义一个单一名为 `extract_data`（或业务名）的 tool。
2. 设置 `tool_choice: { type: "tool", name: "extract_data" }` 强制调用。
3. 模型返回的 `tool_use.input` 即为结构化 JSON。
4. TypeScript SDK 提供 `messages.parse()` + `zodOutputFormat()` / `jsonSchemaOutputFormat()` 封装。

### 7.2 Gemini 关键说明
必须同时设置：
```json
{
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseJsonSchema": { ... }
  }
}
```
仅传 `responseJsonSchema` 不生效。

### 7.3 Kimi 关键说明
Kimi（Moonshot）提供 **OpenAI 兼容 API**，Base URL 为 `https://api.moonshot.cn/v1`。

- 可直接复用 OpenAI Node.js SDK，只需传入 `apiKey` 和 `baseURL`。
- 结构化输出同样使用 `response_format: { type: "json_schema", ... }`。
- 默认模型建议 `kimi-k2-5`。

```typescript
const client = new OpenAI({
  apiKey: env.KIMI_API_KEY,
  baseURL: 'https://api.moonshot.cn/v1',
});
```

---

## 8. 监控与告警

| 事件 | 处理方式 |
|------|---------|
| `native_success` | 正常通过，可打 info 日志 |
| `fallback_parse_success` | 记录，用于评估弱模型质量 |
| `fallback_parse_fail` | 告警阈值，连续 N 次触发通知 |
| `schema_validation_fail` | 记录原始响应，用于优化 schema/prompt |

---

## 9. 实现状态

### 已完成
- [x] 初始化 `packages/ai-schema` 共享包（含 Block-based Zod Schema 与组件白名单）
- [x] 实现 `backend/adapters/` 下各模型 Adapter（OpenAI / Anthropic / Gemini / Kimi / Fallback）
- [x] 实现 `structuredOutput.ts` 统一服务与校验逻辑
- [x] 实现 Express Route `/api/ai/generate`
- [x] 前端 Vue3 `useAIGenerate` composable
- [x] 前端 `AIRenderer.vue` Block 严格映射渲染
- [x] Node 24 原生 `--env-file` 环境变量配置

### 待补充
- [ ] 集成测试（覆盖 OpenAI / Anthropic / Gemini / Kimi / Fallback 五种路径）
- [ ] 接入 `markstream-vue` 替换当前 Markdown 占位渲染
- [ ] `fallbackAdapter.ts` 中补充通用 LLM HTTP 客户端实现
- [ ] 生产环境日志与监控告警埋点
