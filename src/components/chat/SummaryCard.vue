<template>
  <AICard
    :provider="provider"
    :config="config"
    :minimized="resolvedMinimized"
    :maximized="resolvedMaximized"
    class="summary-ai-card"
    @toggle-minimized="toggleMinimized"
    @toggle-maximized="toggleMaximized"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AICard from './AICard.vue'
import type { AIProvider, CardConfig } from '../../types'

interface Props {
  provider: AIProvider
  config?: CardConfig
  maximized?: boolean
  minimized?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maximized: undefined,
  minimized: undefined
})

const emit = defineEmits<{
  (e: 'toggle-minimized'): void
  (e: 'toggle-maximized'): void
}>()

const internalMinimized = ref(false)
const internalMaximized = ref(false)

const hasExternalMaximized = computed(() => props.maximized !== undefined)
const hasExternalMinimized = computed(() => props.minimized !== undefined)

const resolvedMaximized = computed(() =>
  hasExternalMaximized.value ? props.maximized : internalMaximized.value
)

const resolvedMinimized = computed(() =>
  hasExternalMinimized.value ? props.minimized : internalMinimized.value
)

const toggleMinimized = () => {
  if (hasExternalMinimized.value) {
    emit('toggle-minimized')
  } else {
    internalMinimized.value = !internalMinimized.value
  }
}

const toggleMaximized = () => {
  if (hasExternalMaximized.value) {
    emit('toggle-maximized')
  } else {
    internalMaximized.value = !internalMaximized.value
  }
}
</script>