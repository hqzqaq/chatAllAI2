<template>
  <AICard
    :provider="provider"
    :config="config"
    :minimized="minimized"
    :maximized="maximized"
    class="summary-ai-card"
    @toggle-minimized="minimized = !minimized"
    @toggle-maximized="maximized = !maximized"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AICard from './AICard.vue'
import type { AIProvider, CardConfig } from '../../types'

interface Props {
  provider: AIProvider
  config?: CardConfig
}

defineProps<Props>()

const minimized = ref(false)
const maximized = ref(false)
</script>