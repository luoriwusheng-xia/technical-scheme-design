<script setup lang="ts">
import type { Block } from '@aiblocks/ai-schema'
import DataTable from './DataTable.vue'
import Chart from './Chart.vue'
import Form from './Form.vue'

const props = defineProps<{
  blocks: Block[]
}>()

const componentMap = {
  DataTable,
  Chart,
  Form,
} as const
</script>

<template>
  <div class="ai-content" style="display: flex; flex-direction: column; gap: 16px;">
    <template v-for="(block, index) in blocks" :key="index">
      <!-- 若已安装 markstream-vue，可替换为 <MarkStream :content="block.content" /> -->
      <div
        v-if="block.type === 'markdown'"
        class="markdown-body"
        style="line-height: 1.6;"
        v-html="block.content.replace(/\n/g, '<br>')"
      />
      <component
        v-else-if="block.type === 'component'"
        :is="componentMap[block.component]"
        v-bind="block.props"
      />
    </template>
  </div>
</template>
