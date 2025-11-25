/**
 * 豆包 SSE 监控预加载脚本
 * 用于劫持EventSource和fetch API，监控SSE请求状态
 * 
 * @author huquanzhi
 * @since 2024-12-19 14:30
 * @version 1.0
 */

const { ipcRenderer } = require('electron')

// 保存原始的 EventSource 构造函数
const OriginalEventSource = window.EventSource

// 重写 EventSource
window.EventSource = class extends OriginalEventSource {
  constructor(url, options) {
    super(url, options)
    
    // 验证是否是豆包的SSE请求
    if (url && url.includes('doubao.com')) {
      console.log(`[Doubao SSE] 创建EventSource连接: ${url}`)
      
      // 向宿主发送：开始连接 SSE
      ipcRenderer.sendToHost('sse-status', {
        type: 'connect',
        url: url,
        status: 'connecting',
        timestamp: Date.now()
      })

      // 监听连接成功
      this.addEventListener('open', (event) => {
        console.log(`[Doubao SSE] 连接成功`)
        ipcRenderer.sendToHost('sse-status', {
          type: 'open',
          url: url,
          status: 'connected',
          timestamp: Date.now()
        })
      })

      // 监听收到消息
      this.addEventListener('message', (event) => {
        console.log(`[Doubao SSE] 收到消息，数据长度: ${event.data ? event.data.length : 0}`)
        ipcRenderer.sendToHost('sse-status', {
          type: 'message',
          url: url,
          status: 'receiving',
          timestamp: Date.now(),
          dataLength: event.data ? event.data.length : 0,
          data: event.data
        })
      })

      // 监听错误/断开
      this.addEventListener('error', (event) => {
        console.log(`[Doubao SSE] 连接错误或断开`)
        ipcRenderer.sendToHost('sse-status', {
          type: 'error',
          url: url,
          status: 'error/closed',
          timestamp: Date.now()
        })
      })
    } else {
      console.log(`[Doubao SSE] 非豆包URL，跳过监控: ${url}`)
    }
  }
}

// 重写 fetch API 以处理流式响应
const originalFetch = window.fetch
window.fetch = async (...args) => {
  const response = await originalFetch(...args)
  
  // 检查是否是流式响应
  const url = args[0] instanceof Request ? args[0].url : args[0]
  
  // 检查是否是豆包的SSE请求
  if (url && url.includes('doubao.com')) {
    console.log(`[Doubao Fetch] 监控请求: ${url}`)
    
    const contentType = response.headers.get('content-type')
    if (contentType && (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson'))) {
      console.log(`[Doubao Fetch] 检测到流式响应`)
      
      ipcRenderer.sendToHost('sse-status', {
        type: 'fetch-stream-start',
        url: url,
        timestamp: Date.now()
      })

      // 克隆 response 以便读取流
      try {
        const clone = response.clone()
        const reader = clone.body.getReader()
        let chunkCount = 0
        
        // 异步读取流监控状态
        ;(async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                console.log(`[Doubao Fetch] 流读取完成，共读取 ${chunkCount} 个数据块`)
                ipcRenderer.sendToHost('sse-status', {
                  type: 'fetch-stream-end',
                  url: url,
                  status: 'completed',
                  timestamp: Date.now(),
                  totalChunks: chunkCount
                })
                break
              }
              
              // 收到数据块
              chunkCount++
              if (chunkCount % 5 === 0 || chunkCount === 1) {
                // 每5个数据块报告一次状态，避免过于频繁
                console.log(`[Doubao Fetch] 收到第 ${chunkCount} 个数据块，大小: ${value ? value.length : 0}`)
              }
              
              ipcRenderer.sendToHost('sse-status', {
                type: 'message',
                url: url,
                status: 'receiving-chunk',
                timestamp: Date.now(),
                chunkIndex: chunkCount,
                size: value ? value.length : 0
              })
            }
          } catch (err) {
            console.error(`[Doubao Fetch] 流读取错误:`, err)
            ipcRenderer.sendToHost('sse-status', {
              type: 'fetch-error',
              url: url,
              status: 'error',
              timestamp: Date.now(),
              error: err.message
            })
          }
        })()
      } catch (cloneError) {
        console.error(`[Doubao Fetch] 克隆响应失败:`, cloneError)
      }
    }
  }

  return response
}

// 为了确保代码加载，添加一个标记
console.log('[Doubao Preload] SSE监控脚本已加载')