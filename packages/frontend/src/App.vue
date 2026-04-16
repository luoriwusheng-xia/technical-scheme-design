<script setup lang="ts">
import { ref } from 'vue'
import { useAIGenerate } from './composables/useAIGenerate'
import AIRenderer from './components/AIRenderer.vue'

const prompt = ref('')
const schemaId = ref('recipe-extractor')
const provider = ref<'openai' | 'anthropic' | 'gemini' | 'kimi' | 'fallback'>('openai')

const { generate, result, loading, error } = useAIGenerate()
</script>

<template>
  <div style="max-width: 800px; margin: 0 auto; padding: 24px;">
    <h1>AIBlocks</h1>
    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
      <select v-model="provider">
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="gemini">Gemini</option>
        <option value="kimi">Kimi</option>
        <option value="fallback">Fallback</option>
      </select>
      <select v-model="schemaId">
        <option value="recipe-extractor">Recipe Extractor</option>
        <option value="ai-output">Generic AI Output</option>
      </select>
      <textarea
        v-model="prompt"
        rows="4"
        placeholder="Enter your prompt here..."
      />
      <button :disabled="loading" @click="generate({ provider, schemaId, prompt: prompt || 'Give me a recipe for chocolate chip cookies.' })">
        {{ loading ? 'Generating...' : 'Generate' }}
      </button>
    </div>

    <div v-if="error" style="color: red;">{{ error }}</div>

    <div v-if="result">
      <AIRenderer v-if="result.success" :blocks="result.data.blocks" />
      <pre v-else style="background: #f5f5f5; padding: 16px; border-radius: 8px;">{{ result.rawText }}</pre>
    </div>
  </div>
</template>
