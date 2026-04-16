import { ref } from 'vue'

interface GenerateParams {
  provider: string
  schemaId: string
  prompt: string
  model?: string
  temperature?: number
}

export function useAIGenerate() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const result = ref<{ success: true; data: any } | { success: false; rawText: string } | null>(null)

  async function generate(params: GenerateParams) {
    loading.value = true
    error.value = null
    result.value = null

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      result.value = await res.json()
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  return { generate, result, loading, error }
}
