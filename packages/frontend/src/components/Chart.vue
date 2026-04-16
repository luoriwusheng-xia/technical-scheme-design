<script setup lang="ts">
import type { ChartProps } from '@aiblocks/ai-schema'

defineProps<ChartProps>()
</script>

<template>
  <div style="padding: 16px; border: 1px solid #ddd; border-radius: 8px;">
    <h3 v-if="title">{{ title }}</h3>
    <p><strong>Type:</strong> {{ type }}</p>
    <ul>
      <li v-for="(label, idx) in labels" :key="idx">
        {{ label }}: {{ data[idx] }}
      </li>
    </ul>
    <p style="color: #888; font-size: 12px;">(Chart visualization placeholder)</p>
  </div>
</template>
