import { ref, computed } from 'vue'
import { useChatStore, useSummaryStore } from '../stores'
import { summaryService } from '../services/SummaryService'
import { ElMessage } from 'element-plus'
import type { AIProvider } from '../types'

export function useSummary() {
  const chatStore = useChatStore()
  const summaryStore = useSummaryStore()

  const sidebarVisible = ref(true)
  const selectedSummaryProvider = ref<AIProvider | null>(null)
  const selectedSummaryProviderId = ref<string>('deepseek')
  const loggedInProviders = computed(() => chatStore.loggedInProviders)
  const allProviders = computed(() => chatStore.providers)

  function handleSummaryClick(): void {
    const providerId = selectedSummaryProviderId.value
    const selectedProvider = chatStore.providers.find((p) => p.id === providerId)
    if (!selectedProvider) {
      ElMessage.error('未找到默认总结模型')
      return
    }
    selectedSummaryProvider.value = selectedProvider
    if (sidebarVisible.value) {
      sidebarVisible.value = false
      setTimeout(() => { sidebarVisible.value = true }, 0)
    } else {
      sidebarVisible.value = true
    }
    executeSummary(providerId)
  }

  async function executeSummary(providerId: string): Promise<void> {
    const originalQuery = chatStore.currentMessage || '总结各AI的回答'
    const selectedProvider = chatStore.providers.find((p) => p.id === providerId)
    if (!selectedProvider) {
      ElMessage.error('未找到选中的AI模型')
      return
    }
    const providersForSummary = [...loggedInProviders.value]
    if (!providersForSummary.find((p) => p.id === providerId)) {
      providersForSummary.push(selectedProvider)
    }
    const success = await summaryService.executeSummary(
      { summaryProviderId: `summary-${providerId}`, originalQuery },
      providersForSummary
    )
    if (success) {
      ElMessage.success(`已创建 ${selectedProvider.name} (总结) 选项卡，请在侧边栏中查看`)
    }
  }

  function handleSummaryModelChange(providerId: string): void {
    selectedSummaryProviderId.value = providerId
    const selectedProvider = chatStore.providers.find((p) => p.id === providerId)
    if (selectedProvider) {
      selectedSummaryProvider.value = selectedProvider
    }
  }

  return {
    sidebarVisible,
    selectedSummaryProvider,
    selectedSummaryProviderId,
    loggedInProviders,
    allProviders,
    handleSummaryClick,
    handleSummaryModelChange
  }
}
