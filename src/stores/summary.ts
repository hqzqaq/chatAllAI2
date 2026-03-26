/**
 * AI总结状态管理
 *
 * @author huquanzhi
 * @since 2026-03-24
 * @version 1.0
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  SummaryResult,
  SummaryStatus,
  SummaryProgress,
  SummaryHistoryItem,
  AIResponse
} from '../types/summary'

/**
 * 总结状态管理
 */
export const useSummaryStore = defineStore('summary', () => {
  // 当前总结结果
  const currentSummary = ref<SummaryResult | null>(null)

  // 总结状态
  const status = ref<SummaryStatus>('idle')

  // 总结进度
  const progress = ref<SummaryProgress>({
    status: 'idle',
    collectedCount: 0,
    totalCount: 0,
    message: ''
  })

  // 总结历史记录（最近10条）
  const history = ref<SummaryHistoryItem[]>([])

  // 总结模型卡片状态（用于在侧边栏显示独立的总结选项卡）
  const summaryCardProvider = ref<{ providerId: string; providerName: string; isVisible: boolean } | null>(null)

  // 是否正在总结
  const isSummarizing = computed(() => status.value === 'collecting' || status.value === 'summarizing')

  // 是否可以开始新的总结
  const canStartSummary = computed(() => status.value === 'idle' || status.value === 'completed' || status.value === 'error')

  // 是否有完成的总结
  const hasCompletedSummary = computed(() => status.value === 'completed' && currentSummary.value !== null)

  /**
   * 开始新的总结
   * @param originalQuery 原始问题
   * @param totalCount 总AI数量
   */
  const startSummary = (originalQuery: string, totalCount: number): void => {
    status.value = 'collecting'
    progress.value = {
      status: 'collecting',
      collectedCount: 0,
      totalCount,
      message: '正在收集各AI回答...'
    }

    // 创建新的总结结果对象
    currentSummary.value = {
      id: generateSummaryId(),
      originalQuery,
      summaryContent: '',
      responses: [],
      summaryProviderId: '',
      summaryProviderName: '',
      timestamp: new Date(),
      status: 'collecting'
    }
  }

  /**
   * 设置收集状态
   * @param collectedCount 已收集数量
   * @param totalCount 总数量
   * @param response 新收集的回答（可选）
   */
  const setCollectingStatus = (collectedCount: number, totalCount: number, response?: AIResponse): void => {
    status.value = 'collecting'
    progress.value = {
      status: 'collecting',
      collectedCount,
      totalCount,
      message: `正在收集各AI回答... (${collectedCount}/${totalCount})`
    }

    if (response && currentSummary.value) {
      currentSummary.value.responses.push(response)
    }
  }

  /**
   * 设置总结中状态
   * @param summaryProviderId 执行总结的AI提供商ID
   * @param summaryProviderName 执行总结的AI提供商名称
   */
  const setSummarizingStatus = (summaryProviderId: string, summaryProviderName: string): void => {
    status.value = 'summarizing'
    progress.value = {
      status: 'summarizing',
      collectedCount: progress.value.collectedCount,
      totalCount: progress.value.totalCount,
      message: `正在使用 ${summaryProviderName} 生成总结...`
    }

    if (currentSummary.value) {
      currentSummary.value.status = 'summarizing'
      currentSummary.value.summaryProviderId = summaryProviderId
      currentSummary.value.summaryProviderName = summaryProviderName
    }
  }

  /**
   * 设置总结完成
   * @param summaryContent 总结内容
   */
  const setCompletedResult = (summaryContent: string): void => {
    status.value = 'completed'
    progress.value = {
      status: 'completed',
      collectedCount: progress.value.totalCount,
      totalCount: progress.value.totalCount,
      message: '总结完成'
    }

    if (currentSummary.value) {
      currentSummary.value.status = 'completed'
      currentSummary.value.summaryContent = summaryContent
      currentSummary.value.timestamp = new Date()

      // 添加到历史记录
      addToHistory(currentSummary.value)
    }
  }

  /**
   * 设置错误状态
   * @param error 错误信息
   */
  const setErrorStatus = (error: string): void => {
    status.value = 'error'
    progress.value = {
      status: 'error',
      collectedCount: progress.value.collectedCount,
      totalCount: progress.value.totalCount,
      message: `总结失败: ${error}`
    }

    if (currentSummary.value) {
      currentSummary.value.status = 'error'
      currentSummary.value.error = error
    }
  }

  /**
   * 清除当前总结
   */
  const clearSummary = (): void => {
    currentSummary.value = null
    status.value = 'idle'
    progress.value = {
      status: 'idle',
      collectedCount: 0,
      totalCount: 0,
      message: ''
    }
  }

  /**
   * 添加到历史记录
   * @param result 总结结果
   */
  const addToHistory = (result: SummaryResult): void => {
    const historyItem: SummaryHistoryItem = {
      id: result.id,
      querySummary: result.originalQuery.length > 50
        ? `${result.originalQuery.substring(0, 50)}...`
        : result.originalQuery,
      summaryProviderName: result.summaryProviderName,
      timestamp: result.timestamp,
      status: result.status
    }

    // 添加到历史记录开头
    history.value.unshift(historyItem)

    // 只保留最近10条
    if (history.value.length > 10) {
      history.value = history.value.slice(0, 10)
    }

    // 保存到本地存储
    saveHistoryToStorage()
  }

  /**
   * 从历史记录中加载总结
   * @param id 总结ID
   * @returns 是否成功加载
   */
  const loadSummaryFromHistory = (id: string): boolean =>
    // 这里可以实现从本地存储加载完整总结的逻辑
    // 目前仅返回false，表示需要从服务重新获取
    false

  /**
   * 删除历史记录项
   * @param id 总结ID
   */
  const removeFromHistory = (id: string): void => {
    const index = history.value.findIndex((item) => item.id === id)
    if (index > -1) {
      history.value.splice(index, 1)
      saveHistoryToStorage()
    }
  }

  /**
   * 清除所有历史记录
   */
  const clearHistory = (): void => {
    history.value = []
    saveHistoryToStorage()
  }

  /**
   * 保存历史记录到本地存储
   */
  const saveHistoryToStorage = (): void => {
    try {
      localStorage.setItem('summary-history', JSON.stringify(history.value))
    } catch (error) {
      console.error('保存总结历史记录失败:', error)
    }
  }

  /**
   * 从本地存储加载历史记录
   */
  const loadHistoryFromStorage = (): void => {
    try {
      const stored = localStorage.getItem('summary-history')
      if (stored) {
        const parsed = JSON.parse(stored)
        // 转换日期字符串为Date对象
        history.value = parsed.map((item: SummaryHistoryItem) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
      }
    } catch (error) {
      console.error('加载总结历史记录失败:', error)
      history.value = []
    }
  }

  /**
   * 更新回答内容
   * @param providerId AI提供商ID
   * @param content 回答内容
   * @param success 是否成功
   * @param error 错误信息
   */
  const updateResponse = (
    providerId: string,
    providerName: string,
    content: string,
    success: boolean,
    error?: string
  ): void => {
    if (!currentSummary.value) return

    const existingIndex = currentSummary.value.responses.findIndex(
      (r) => r.providerId === providerId
    )

    const response: AIResponse = {
      providerId,
      providerName,
      content,
      timestamp: new Date(),
      success,
      error
    }

    if (existingIndex > -1) {
      currentSummary.value.responses[existingIndex] = response
    } else {
      currentSummary.value.responses.push(response)
    }
  }

  /**
   * 设置总结模型卡片
   * @param providerId AI提供商ID
   * @param providerName AI提供商名称
   */
  const setSummaryCardProvider = (providerId: string, providerName: string): void => {
    summaryCardProvider.value = {
      providerId,
      providerName,
      isVisible: true
    }
  }

  /**
   * 清除总结模型卡片
   */
  const clearSummaryCardProvider = (): void => {
    summaryCardProvider.value = null
  }

  /**
   * 生成总结ID
   * @returns 唯一ID
   */
  function generateSummaryId(): string {
    return `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 初始化时加载历史记录
  loadHistoryFromStorage()

  return {
    // 状态
    currentSummary,
    status,
    progress,
    history,
    summaryCardProvider,

    // 计算属性
    isSummarizing,
    canStartSummary,
    hasCompletedSummary,

    // 方法
    startSummary,
    setCollectingStatus,
    setSummarizingStatus,
    setCompletedResult,
    setErrorStatus,
    clearSummary,
    addToHistory,
    loadSummaryFromHistory,
    removeFromHistory,
    clearHistory,
    updateResponse,
    loadHistoryFromStorage,
    setSummaryCardProvider,
    clearSummaryCardProvider
  }
})
