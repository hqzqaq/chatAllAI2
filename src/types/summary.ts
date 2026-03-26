/**
 * AI总结功能类型定义
 *
 * @author huquanzhi
 * @since 2026-03-24
 * @version 1.0
 */

/**
 * 总结状态
 */
export type SummaryStatus = 'idle' | 'collecting' | 'summarizing' | 'completed' | 'error'

/**
 * AI回答内容
 */
export interface AIResponse {
  /** AI提供商ID */
  providerId: string
  /** AI提供商名称 */
  providerName: string
  /** 回答内容 */
  content: string
  /** 获取时间 */
  timestamp: Date
  /** 是否成功获取 */
  success: boolean
  /** 错误信息（如果获取失败） */
  error?: string
}

/**
 * 总结结果
 */
export interface SummaryResult {
  /** 总结ID */
  id: string
  /** 原始问题 */
  originalQuery: string
  /** 总结内容 */
  summaryContent: string
  /** 各AI回答列表 */
  responses: AIResponse[]
  /** 执行总结的AI提供商ID */
  summaryProviderId: string
  /** 执行总结的AI提供商名称 */
  summaryProviderName: string
  /** 生成时间 */
  timestamp: Date
  /** 总结状态 */
  status: SummaryStatus
  /** 错误信息（如果总结失败） */
  error?: string
}

/**
 * 导出配置
 */
export interface ExportConfig {
  /** 导出格式 */
  format: 'md' | 'pdf' | 'docx' | 'html'
  /** 文件名（可选） */
  filename?: string
  /** 是否包含时间戳 */
  includeTimestamp?: boolean
  /** 是否包含AI提供商信息 */
  includeProviderInfo?: boolean
}

/**
 * 总结选项
 */
export interface SummaryOptions {
  /** 执行总结的AI提供商ID */
  summaryProviderId: string
  /** 原始问题 */
  originalQuery: string
  /** 自定义提示词模板（可选） */
  promptTemplate?: string
  /** 最大长度限制（可选） */
  maxLength?: number
  /** 重点关注领域（可选） */
  focusAreas?: string[]
}

/**
 * 总结进度信息
 */
export interface SummaryProgress {
  /** 当前状态 */
  status: SummaryStatus
  /** 已收集的回答数量 */
  collectedCount: number
  /** 总回答数量 */
  totalCount: number
  /** 当前步骤描述 */
  message: string
}

/**
 * 总结历史记录项
 */
export interface SummaryHistoryItem {
  /** 总结ID */
  id: string
  /** 原始问题摘要 */
  querySummary: string
  /** 执行总结的AI提供商名称 */
  summaryProviderName: string
  /** 生成时间 */
  timestamp: Date
  /** 总结状态 */
  status: SummaryStatus
}
