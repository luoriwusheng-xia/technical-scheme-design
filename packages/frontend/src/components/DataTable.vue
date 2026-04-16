<script setup lang="ts">
import type { DataTableProps } from '@aiblocks/ai-schema'

defineProps<DataTableProps>()
</script>

<template>
  <div>
    <h3 v-if="title">{{ title }}</h3>
    <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key">{{ col.title }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, idx) in rows" :key="idx">
          <td v-for="col in columns" :key="col.key">{{ row[col.key] ?? '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
