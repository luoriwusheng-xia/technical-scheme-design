<script setup lang="ts">
import type { FormProps } from '@aiblocks/ai-schema'

defineProps<FormProps>()
</script>

<template>
  <form style="padding: 16px; border: 1px solid #ddd; border-radius: 8px; display: flex; flex-direction: column; gap: 12px;">
    <h3 v-if="title">{{ title }}</h3>
    <div v-for="field in fields" :key="field.name">
      <label :for="field.name">{{ field.label }}{{ field.required ? ' *' : '' }}</label>
      <input
        v-if="field.type === 'text' || field.type === 'email' || field.type === 'number'"
        :id="field.name"
        :type="field.type"
        :name="field.name"
        :required="field.required"
        style="width: 100%; padding: 8px; box-sizing: border-box;"
      />
      <textarea
        v-else-if="field.type === 'textarea'"
        :id="field.name"
        :name="field.name"
        :required="field.required"
        style="width: 100%; padding: 8px; box-sizing: border-box;"
        rows="3"
      />
      <select
        v-else-if="field.type === 'select'"
        :id="field.name"
        :name="field.name"
        :required="field.required"
        style="width: 100%; padding: 8px; box-sizing: border-box;"
      >
        <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </div>
    <button type="submit" style="padding: 10px;">{{ submitLabel || 'Submit' }}</button>
  </form>
</template>
