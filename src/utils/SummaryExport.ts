/**
 * AI总结导出工具
 *
 * @author huquanzhi
 * @since 2026-03-24
 * @version 1.0
 */

import type { SummaryResult, ExportConfig, AIResponse } from '../types/summary'

/**
 * 生成时间戳字符串
 * @returns 格式化的时间戳字符串
 */
function generateTimestamp(): string {
  const now = new Date()
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

/**
 * 生成文件名
 * @param config 导出配置
 * @returns 完整的文件名
 */
function generateFilename(config: ExportConfig): string {
  if (config.filename) {
    return config.filename
  }

  const timestamp = config.includeTimestamp !== false ? `_${generateTimestamp()}` : ''
  return `summary${timestamp}.${config.format}`
}

/**
 * 转义HTML特殊字符
 * @param text 原始文本
 * @returns 转义后的文本
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 导出为 Markdown 格式
 * @param result 总结结果
 * @param config 导出配置
 * @returns Markdown 内容
 */
export function exportToMarkdown(result: SummaryResult, config: ExportConfig = { format: 'md' }): string {
  const lines: string[] = []

  // 标题
  lines.push('# AI 回答总结报告')
  lines.push('')

  // 元信息
  lines.push('## 元信息')
  lines.push('')
  lines.push(`- **原始问题**: ${result.originalQuery}`)
  lines.push(`- **总结模型**: ${result.summaryProviderName}`)
  lines.push(`- **生成时间**: ${result.timestamp.toLocaleString('zh-CN')}`)
  lines.push(`- **参与AI数量**: ${result.responses.filter((r) => r.success).length}`)
  lines.push('')

  // 总结内容
  lines.push('## 总结内容')
  lines.push('')
  lines.push(result.summaryContent)
  lines.push('')

  // 各AI回答详情
  if (config.includeProviderInfo !== false) {
    lines.push('---')
    lines.push('')
    lines.push('## 各AI原始回答')
    lines.push('')

    result.responses.forEach((response, index) => {
      lines.push(`### ${index + 1}. ${response.providerName}`)
      lines.push('')
      if (response.success) {
        lines.push(response.content)
      } else {
        lines.push(`> ⚠️ 获取失败: ${response.error || '未知错误'}`)
      }
      lines.push('')
    })
  }

  // 失败的AI列表
  const failedResponses = result.responses.filter((r) => !r.success)
  if (failedResponses.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push('## 未能获取回答的AI')
    lines.push('')
    failedResponses.forEach((response) => {
      lines.push(`- **${response.providerName}**: ${response.error || '获取失败'}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * 导出为 HTML 格式
 * @param result 总结结果
 * @param config 导出配置
 * @returns HTML 内容
 */
export function exportToHTML(result: SummaryResult, config: ExportConfig = { format: 'html' }): string {
  const failedResponses = result.responses.filter((r) => !r.success)
  const successfulResponses = result.responses.filter((r) => r.success)

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 回答总结报告</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 40px;
    }
    h1 {
      color: #1a1a1a;
      font-size: 28px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e0e0e0;
    }
    h2 {
      color: #2c2c2c;
      font-size: 22px;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    h3 {
      color: #3c3c3c;
      font-size: 18px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    .meta-info {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .meta-info p {
      margin: 8px 0;
      color: #555;
    }
    .meta-info strong {
      color: #333;
    }
    .summary-content {
      background: #fafafa;
      border-left: 4px solid #4a90e2;
      padding: 20px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 32px;
    }
    .summary-content h1,
    .summary-content h2,
    .summary-content h3 {
      margin-top: 0;
    }
    .response-item {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .response-item h3 {
      margin-top: 0;
      color: #4a90e2;
    }
    .response-content {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .error-item {
      background: #fff3f3;
      border-left: 4px solid #e74c3c;
      padding: 12px 16px;
      margin-bottom: 12px;
      border-radius: 0 6px 6px 0;
    }
    .error-item strong {
      color: #e74c3c;
    }
    hr {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 32px 0;
    }
    ul, ol {
      margin-left: 20px;
      margin-bottom: 16px;
    }
    li {
      margin: 8px 0;
    }
    code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 16px 0;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 16px;
      margin: 16px 0;
      color: #666;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .container {
        box-shadow: none;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>AI 回答总结报告</h1>
    
    <div class="meta-info">
      <p><strong>原始问题:</strong> ${escapeHtml(result.originalQuery)}</p>
      <p><strong>总结模型:</strong> ${escapeHtml(result.summaryProviderName)}</p>
      <p><strong>生成时间:</strong> ${result.timestamp.toLocaleString('zh-CN')}</p>
      <p><strong>参与AI数量:</strong> ${successfulResponses.length}</p>
    </div>

    <h2>总结内容</h2>
    <div class="summary-content">
      ${result.summaryContent.replace(/\n/g, '<br>')}
    </div>

    ${config.includeProviderInfo !== false ? `
    <hr>
    <h2>各AI原始回答</h2>
    ${result.responses.map((response, index) => `
    <div class="response-item">
      <h3>${index + 1}. ${escapeHtml(response.providerName)}</h3>
      <div class="response-content">
        ${response.success ? escapeHtml(response.content).replace(/\n/g, '<br>') : `<div class="error-item"><strong>⚠️ 获取失败:</strong> ${escapeHtml(response.error || '未知错误')}</div>`}
      </div>
    </div>
    `).join('')}
    ` : ''}

    ${failedResponses.length > 0 ? `
    <hr>
    <h2>未能获取回答的AI</h2>
    ${failedResponses.map((response) => `
    <div class="error-item">
      <strong>${escapeHtml(response.providerName)}:</strong> ${escapeHtml(response.error || '获取失败')}
    </div>
    `).join('')}
    ` : ''}
  </div>
</body>
</html>`

  return html
}

/**
 * 导出为 PDF 格式（使用浏览器打印功能）
 * @param result 总结结果
 * @param config 导出配置
 */
export function exportToPDF(result: SummaryResult, config: ExportConfig = { format: 'pdf' }): void {
  const html = exportToHTML(result, { ...config, format: 'html' })
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    throw new Error('无法打开打印窗口，请检查浏览器设置')
  }

  printWindow.document.write(html)
  printWindow.document.close()

  // 等待样式加载完成后打印
  setTimeout(() => {
    printWindow.print()
  }, 500)
}

/**
 * 导出为 DOCX 格式（简化版，使用 HTML 作为中间格式）
 * @param result 总结结果
 * @param config 导出配置
 */
export function exportToDOCX(result: SummaryResult, config: ExportConfig = { format: 'docx' }): void {
  // 由于 docx.js 库较大，这里使用 HTML 格式作为替代
  // 用户可以将 HTML 文件在 Word 中打开并另存为 DOCX
  const html = exportToHTML(result, { ...config, format: 'html' })
  const blob = new Blob([html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = generateFilename(config).replace('.docx', '.doc')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * 下载文件
 * @param content 文件内容
 * @param filename 文件名
 * @param mimeType MIME类型
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * 执行导出
 * @param result 总结结果
 * @param config 导出配置
 */
export function executeExport(result: SummaryResult, config: ExportConfig): void {
  const filename = generateFilename(config)

  switch (config.format) {
    case 'md':
      downloadFile(exportToMarkdown(result, config), filename, 'text/markdown')
      break
    case 'html':
      downloadFile(exportToHTML(result, config), filename, 'text/html')
      break
    case 'pdf':
      exportToPDF(result, config)
      break
    case 'docx':
      exportToDOCX(result, config)
      break
    default:
      throw new Error(`不支持的导出格式: ${config.format}`)
  }
}

/**
 * 获取导出格式的显示名称
 * @param format 导出格式
 * @returns 显示名称
 */
export function getExportFormatName(format: ExportConfig['format']): string {
  const formatNames: Record<string, string> = {
    md: 'Markdown',
    html: 'HTML',
    pdf: 'PDF',
    docx: 'Word'
  }
  return formatNames[format] || format
}

/**
 * 获取导出文件的 MIME 类型
 * @param format 导出格式
 * @returns MIME 类型
 */
export function getExportMimeType(format: ExportConfig['format']): string {
  const mimeTypes: Record<string, string> = {
    md: 'text/markdown',
    html: 'text/html',
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return mimeTypes[format] || 'text/plain'
}
