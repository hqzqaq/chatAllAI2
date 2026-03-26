/**
 * AI总结服务
 *
 * @author huquanzhi
 * @since 2026-03-24
 * @version 1.0
 */

import type { AIProvider } from '../types'
import type { SummaryResult, AIResponse, SummaryOptions } from '../types/summary'
import { getSendMessageScript } from '../utils/GetLLMLastMessage'
import { generateSummaryPrompt } from '../utils/SummaryPrompts'
import { useSummaryStore } from '../stores/summary'
import { ElMessage } from 'element-plus'

/**
 * 收集响应结果
 */
interface CollectResult {
  success: boolean
  responses: AIResponse[]
  error?: string
}

/**
 * 发送消息结果
 */
interface SendMessageResult {
  success: boolean
  messageId: string
  error?: string
}

/**
 * 总结服务类
 */
export class SummaryService {
  private static instance: SummaryService

  private abortController: AbortController | null = null

  /**
   * 获取单例实例
   */
  static getInstance(): SummaryService {
    if (!SummaryService.instance) {
      SummaryService.instance = new SummaryService()
    }
    return SummaryService.instance
  }

  /**
   * 收集各AI的回答
   * @param providers AI提供商列表
   * @returns 收集结果
   */
  async collectResponses(providers: AIProvider[]): Promise<CollectResult> {
    const summaryStore = useSummaryStore()
    const responses: AIResponse[] = []
    let successCount = 0

    console.log(`开始收集 ${providers.length} 个AI的回答`)

    // 并发收集所有AI的回答
    const collectPromises = providers.map(async(provider, index) => {
      try {
        console.log(`正在收集 ${provider.name} 的回答...`)
        const content = await this.fetchResponseFromProvider(provider)

        const response: AIResponse = {
          providerId: provider.id,
          providerName: provider.name,
          content,
          timestamp: new Date(),
          success: true
        }

        responses.push(response)
        successCount++

        // 更新进度
        summaryStore.setCollectingStatus(successCount, providers.length, response)

        console.log(`成功收集 ${provider.name} 的回答`)
        return response
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '获取失败'
        console.error(`收集 ${provider.name} 的回答失败:`, errorMessage)

        const response: AIResponse = {
          providerId: provider.id,
          providerName: provider.name,
          content: '',
          timestamp: new Date(),
          success: false,
          error: errorMessage
        }

        responses.push(response)

        // 更新进度
        summaryStore.setCollectingStatus(successCount, providers.length, response)

        return response
      }
    })

    await Promise.all(collectPromises)

    // 按原始顺序排序
    const sortedResponses = providers.map((provider) => responses.find((r) => r.providerId === provider.id) || {
      providerId: provider.id,
      providerName: provider.name,
      content: '',
      timestamp: new Date(),
      success: false,
      error: '未找到响应'
    })

    const successResponses = sortedResponses.filter((r) => r.success && typeof r.content === 'string' && r.content.trim())

    console.log(`收集完成: ${successResponses.length}/${providers.length} 个AI回答成功`)

    if (successResponses.length === 0) {
      return {
        success: false,
        responses: sortedResponses,
        error: '未能获取任何AI的回答，请检查AI是否已完成回答'
      }
    }

    return {
      success: true,
      responses: sortedResponses
    }
  }

  /**
   * 从指定AI提供商获取回答
   * @param provider AI提供商
   * @returns 回答内容
   */
  private async fetchResponseFromProvider(provider: AIProvider): Promise<string> {
    if (!window.electronAPI) {
      throw new Error('Electron API 不可用')
    }

    // 获取执行脚本
    const script = getSendMessageScript(provider.id)

    if (!script) {
      throw new Error(`暂不支持获取 ${provider.name} 的回答`)
    }

    // 重试机制
    let lastError: Error | null = null
    const maxRetries = 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 执行脚本获取回答
        const result = await Promise.race([
          window.electronAPI.executeScriptInWebView(provider.webviewId, script),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('获取回答超时')), 10000))
        ])

        if (typeof result === 'string') {
          return result
        }

        if (result && typeof result.result === 'string') {
          return result.result
        }

        throw new Error('获取到的回答为空')
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(`获取 ${provider.name} 回答失败 (尝试 ${attempt + 1}/${maxRetries}):`, lastError.message)

        if (attempt < maxRetries - 1) {
          // 等待后重试
          await this.delay(1000 * (attempt + 1))
        }
      }
    }

    throw lastError || new Error(`获取 ${provider.name} 回答失败`)
  }

  /**
   * 等待WebView准备好
   * @param webviewId WebView ID
   * @param timeout 超时时间（毫秒）
   * @returns 是否准备好
   */
  private async waitForWebViewReady(webviewId: string, timeout: number = 10000): Promise<boolean> {
    console.log(`等待WebView ${webviewId} 准备好...`)
    const startTime = Date.now()
    const checkInterval = 1000 // 每1秒检查一次

    while (Date.now() - startTime < timeout) {
      try {
        // 尝试执行一个简单的脚本检查WebView是否可用
        if (window.electronAPI) {
          const result = await window.electronAPI.executeScriptInWebView(webviewId, '(() => { return document.readyState })()')
          console.log(`WebView ${webviewId} 状态: ${result}`)
          if (result) {
            console.log(`WebView ${webviewId} 已准备好`)
            return true
          }
        }
      } catch (error) {
        // WebView还未准备好，继续等待
        console.log(`WebView ${webviewId} 还未准备好，继续等待...`)
      }

      // 等待一段时间后再次检查
      await this.delay(checkInterval)
    }

    console.error(`等待WebView ${webviewId} 超时`)
    return false
  }

  /**
   * 发送总结请求
   * @param summaryProvider 执行总结的AI提供商
   * @param prompt 提示词
   * @param summaryWebviewId 总结模型的WebView ID（可选，用于独立侧边栏）
   * @returns 发送结果
   */
  async sendSummaryRequest(summaryProvider: AIProvider, prompt: string, summaryWebviewId?: string): Promise<SendMessageResult> {
    console.log(`正在发送总结请求到 ${summaryProvider.name}...`)

    if (!window.electronAPI) {
      return {
        success: false,
        messageId: '',
        error: 'Electron API 不可用'
      }
    }

    try {
      // 使用独立的总结WebView ID（如果有）或原始WebView ID
      const targetWebviewId = summaryWebviewId || summaryProvider.webviewId

      // 等待WebView准备好
      const isReady = await this.waitForWebViewReady(targetWebviewId, 30000)
      if (!isReady) {
        return {
          success: false,
          messageId: '',
          error: `WebView ${targetWebviewId} 未能及时准备好，请检查侧边栏中的AI卡片是否已加载完成`
        }
      }

      // 额外等待一段时间确保页面完全加载
      await this.delay(2000)

      // 发送消息到指定的AI
      await window.electronAPI.sendMessageToWebView(targetWebviewId, prompt)

      console.log(`总结请求已发送到 ${summaryProvider.name} (WebView: ${targetWebviewId})`)

      return {
        success: true,
        messageId: `summary_${Date.now()}`
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发送失败'
      console.error(`发送总结请求到 ${summaryProvider.name} 失败:`, errorMessage)

      return {
        success: false,
        messageId: '',
        error: errorMessage
      }
    }
  }

  /**
   * 执行完整的总结流程
   * @param options 总结选项
   * @param providers 所有已登录的AI提供商
   * @returns 是否成功启动总结
   */
  async executeSummary(options: SummaryOptions, providers: AIProvider[]): Promise<boolean> {
    const summaryStore = useSummaryStore()

    // 检查是否可以开始新的总结
    if (!summaryStore.canStartSummary) {
      ElMessage.warning('当前正在进行总结，请等待完成')
      return false
    }

    // 解析总结模型ID（可能是 summary-{providerId} 格式）
    const originalProviderId = options.summaryProviderId.startsWith('summary-')
      ? options.summaryProviderId.substring(8)
      : options.summaryProviderId

    // 获取执行总结的AI提供商
    const summaryProvider = providers.find((p) => p.id === originalProviderId)
    if (!summaryProvider) {
      ElMessage.error('未找到选中的总结模型')
      return false
    }

    // 获取所有已激活的AI模型（包括执行总结的模型本身）
    const targetProviders = providers.filter((p) => p.isLoggedIn)

    if (targetProviders.length === 0) {
      ElMessage.warning('至少需要有一个已登录的AI模型才能进行总结')
      return false
    }

    try {
      // 开始总结流程
      summaryStore.startSummary(options.originalQuery, targetProviders.length)
      this.abortController = new AbortController()

      // 步骤1: 收集各AI回答
      console.log('步骤1: 收集各AI回答')
      const collectResult = await this.collectResponses(targetProviders)

      if (this.abortController.signal.aborted) {
        console.log('总结已被取消')
        return false
      }

      if (!collectResult.success) {
        summaryStore.setErrorStatus(collectResult.error || '收集回答失败')
        ElMessage.error(collectResult.error || '收集回答失败')
        return false
      }

      // 步骤2: 生成提示词
      console.log('步骤2: 生成提示词')
      const prompt = generateSummaryPrompt(
        options.originalQuery,
        collectResult.responses,
        options.promptTemplate
      )

      // 步骤3: 设置总结中状态
      summaryStore.setSummarizingStatus(options.summaryProviderId, summaryProvider.name)

      // 步骤4: 发送总结请求（使用独立的summary-{providerId} webview）
      // 异步发送，不等待结果，让用户可以立即进行下一次总结
      console.log('步骤4: 异步发送总结请求')
      const summaryWebviewId = `webview-${options.summaryProviderId}`
      // 使用Promise.allSettled不等待结果
      Promise.allSettled([
        this.sendSummaryRequest(summaryProvider, prompt, summaryWebviewId)
      ]).then(([result]) => {
        if (result.status === 'rejected') {
          console.error('发送总结请求失败:', result.reason)
        } else if (result.value && !result.value.success) {
          console.error('发送总结请求失败:', result.value.error)
        } else {
          console.log('总结请求发送成功')
        }
      })

      // 立即重置状态，让用户可以再次点击总结
      summaryStore.clearSummary()

      ElMessage.success(`总结请求已发送到 ${summaryProvider.name}，请在侧边栏中查看`)

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '总结过程发生错误'
      console.error('总结流程失败:', errorMessage)
      summaryStore.setErrorStatus(errorMessage)
      ElMessage.error(errorMessage)
      return false
    }
  }

  /**
   * 取消当前的总结操作
   */
  cancelSummary(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
      console.log('总结操作已取消')
    }
  }

  /**
   * 延迟函数
   * @param ms 毫秒数
   * @returns Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * 全局总结服务实例
 */
export const summaryService = SummaryService.getInstance()
