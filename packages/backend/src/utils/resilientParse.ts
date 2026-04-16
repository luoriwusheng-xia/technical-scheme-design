/**
 * 弹性 JSON 提取器
 *
 * 用途：从 AI 模型返回的原始文本中，尽最大努力提取出合法的 JSON 对象/数组。
 *
 * 设计背景：
 * - 强模型（OpenAI/Anthropic/Gemini）的原生结构化输出通常已是干净 JSON，可直接 parse。
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
 *
 * @param raw - AI 返回的原始文本
 * @returns 解析成功时返回 `{ json: any }`，全部失败时返回 `null`
 */
export function resilientJsonExtract(raw: string): { json: any } | null {
  // Layer 1: 原始文本直接就是合法 JSON
  try {
    return { json: JSON.parse(raw) };
  } catch {}

  // Layer 2: 提取 markdown json code block
  // 匹配 ```json ... ``` 或 ``` ... ``` 包裹的内容（非贪婪）
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
