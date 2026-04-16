/**
 * 环境变量简单封装
 *
 * Node 24 原生支持 `--env-file`，无需 dotenv。
 * 此文件仅做一处收敛：禁止业务代码直接访问 process.env，
 * 所有变量统一从此导出，方便后续查找和替换。
 */

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
