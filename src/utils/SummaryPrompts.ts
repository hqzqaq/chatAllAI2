/**
 * AI总结提示词模板工具
 *
 * @author huquanzhi
 * @since 2026-03-24
 * @version 1.0
 */

import type { AIResponse } from '../types/summary'

/**
 * 默认总结提示词模板
 */
export const DEFAULT_SUMMARY_PROMPT = `请对以下多个AI助手的回答进行总结和分析。

## 原始问题
{originalQuery}

## 各AI回答
{responses}

## 总结要求
1. 核心观点总结：提炼各AI回答的核心观点和主要结论
2. 观点对比：分析各AI回答的异同点，指出共识和分歧
3. 详细程度：保持中等详细程度，既要有概括性又要保留关键细节
4. 结构要求：使用清晰的标题和 bullet points 组织内容
5. 语言风格：专业、客观、易于理解

请按以下格式输出总结：

# 回答总结

## 核心观点概述
[概括各AI的核心观点]

## 详细分析
### 共识点
[各AI都认同的观点]

### 差异点
[各AI观点不同的地方]

### 补充观点
[某些AI特有的观点]

## 建议与结论
[基于各AI回答的综合建议]`

/**
 * 简洁版总结提示词模板
 */
export const CONCISE_SUMMARY_PROMPT = `请对以下多个AI助手的回答进行简洁总结。

## 原始问题
{originalQuery}

## 各AI回答
{responses}

## 总结要求
1. 简洁明了：用简短的语言概括核心观点
2. 重点突出：只保留最重要的信息
3. 结构清晰：使用 bullet points 组织内容

请输出简洁的总结：`

/**
 * 详细版总结提示词模板
 */
export const DETAILED_SUMMARY_PROMPT = `请对以下多个AI助手的回答进行详细分析和总结。

## 原始问题
{originalQuery}

## 各AI回答
{responses}

## 总结要求
1. 全面分析：深入分析每个AI的观点和论证
2. 对比研究：详细对比各AI回答的异同
3. 优缺点分析：分析各AI回答的优点和不足
4. 补充信息：提供额外的背景知识和补充信息
5. 结构要求：使用多级标题组织内容

请按以下格式输出详细总结：

# 回答深度分析

## 一、各AI观点概述
[分别概括每个AI的核心观点]

## 二、观点对比分析
### 2.1 共识领域
[详细描述各AI都认同的观点]

### 2.2 分歧领域
[详细描述各AI观点不同的地方及原因]

### 2.3 独特观点
[某些AI特有的、有价值的观点]

## 三、内容质量评估
[分析各AI回答的质量、深度、准确性]

## 四、综合建议
[基于所有AI回答的综合建议和行动方案]`

/**
 * 对比分析提示词模板
 */
export const COMPARISON_PROMPT = `请将以下多个AI助手的回答进行对比分析。

## 原始问题
{originalQuery}

## 各AI回答
{responses}

## 分析要求
1. 制作对比表格：列出各AI在关键问题上的立场
2. 分析差异原因：探讨产生不同观点的可能原因
3. 评估可信度：评估各AI回答的可信度和参考价值

请输出对比分析报告：`

/**
 * 生成总结提示词
 * @param originalQuery 原始问题
 * @param responses AI回答列表
 * @param customPrompt 自定义提示词模板（可选）
 * @returns 完整的提示词
 */
export function generateSummaryPrompt(
  originalQuery: string,
  responses: AIResponse[],
  customPrompt?: string
): string {
  const prompt = customPrompt || DEFAULT_SUMMARY_PROMPT

  const formattedResponses = responses
    .filter(r => r.success && r.content.trim())
    .map((r, index) => `### AI ${index + 1}: ${r.providerName}\n${r.content}`)
    .join('\n\n')

  return prompt
    .replace(/\{originalQuery\}/g, originalQuery)
    .replace(/\{responses\}/g, formattedResponses)
}

/**
 * 生成简洁版总结提示词
 * @param originalQuery 原始问题
 * @param responses AI回答列表
 * @returns 完整的提示词
 */
export function generateConciseSummaryPrompt(
  originalQuery: string,
  responses: AIResponse[]
): string {
  return generateSummaryPrompt(originalQuery, responses, CONCISE_SUMMARY_PROMPT)
}

/**
 * 生成详细版总结提示词
 * @param originalQuery 原始问题
 * @param responses AI回答列表
 * @returns 完整的提示词
 */
export function generateDetailedSummaryPrompt(
  originalQuery: string,
  responses: AIResponse[]
): string {
  return generateSummaryPrompt(originalQuery, responses, DETAILED_SUMMARY_PROMPT)
}

/**
 * 生成对比分析提示词
 * @param originalQuery 原始问题
 * @param responses AI回答列表
 * @returns 完整的提示词
 */
export function generateComparisonPrompt(
  originalQuery: string,
  responses: AIResponse[]
): string {
  return generateSummaryPrompt(originalQuery, responses, COMPARISON_PROMPT)
}

/**
 * 获取失败的AI列表文本
 * @param responses AI回答列表
 * @returns 格式化的失败AI列表文本
 */
export function getFailedResponsesText(responses: AIResponse[]): string {
  const failedResponses = responses.filter(r => !r.success)

  if (failedResponses.length === 0) {
    return ''
  }

  const failedList = failedResponses
    .map(r => `- ${r.providerName}${r.error ? `: ${r.error}` : ''}`)
    .join('\n')

  return `\n\n## 未能获取回答的AI\n以下AI的回答未能成功获取：\n${failedList}`
}
