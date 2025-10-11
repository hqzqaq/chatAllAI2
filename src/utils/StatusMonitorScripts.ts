/**
 * AI状态监控脚本工具类
 * 提供不同AI网站的状态监控脚本，用于检测AI是否正在回复
 *
 * @author huquanzhi
 * @since 2025-10-11 15:57
 * @version 1.0
 */

/**
 * 获取AI状态监控脚本
 * @param providerId AI提供商ID
 * @returns 对应的JavaScript脚本字符串
 */
export function getStatusMonitorScript(providerId: string): string {
  const scripts: Record<string, string> = {
    doubao: getDouBaoStatusMonitorScript(),
    kimi: getKimiStatusMonitorScript(),
    grok: getGrokStatusMonitorScript(),
    deepseek: getDeepSeekStatusMonitorScript(),
    qwen: getQwenStatusMonitorScript(),
    copilot: getCopilotStatusMonitorScript(),
    glm: getGLMStatusMonitorScript(),
    yuanbao: getYuanBaoStatusMonitorScript()
  }

  return scripts[providerId] || getGenericStatusMonitorScript()
}

/**
 * 豆包状态监控脚本
 */
function getDouBaoStatusMonitorScript(): string {
  return `
    (function() {
      // 简化的AI状态监控器
      const aiStatusMonitor = {
        currentStatus: 'waiting_input', // waiting_input, responding, completed
        lastButtonState: null,
        lastMessageCount: 0,
        lastMessageContent: '',
        lastMessageLength: 0,
        responseStartTime: null,
        messageContentStableTimer: null,
        
        // 开始监控
        start: function() {
          console.log('🤖 豆包AI状态监控器启动');
          
          // 监控发送按钮状态
          this.monitorSendButton();
          
          // 监控聊天内容变化
          this.monitorChatContent();
          
          // 监控AI回复指示器
          this.monitorAIResponse();
          
          // 监控消息内容变化
          this.monitorMessageContent();
        },
        
        // 监控发送按钮状态
        monitorSendButton: function() {
          const checkButton = () => {
            const sendButton = document.querySelector('[data-testid="chat_input_send_button"], button[aria-label="发送"]');
            
            if (sendButton) {
              const currentState = {
                disabled: sendButton.disabled,
                ariaDisabled: sendButton.getAttribute('aria-disabled')
              };
              
              // 检测状态变化
              if (JSON.stringify(currentState) !== JSON.stringify(this.lastButtonState)) {
                this.handleButtonStateChange(currentState);
                this.lastButtonState = currentState;
              }
            }
            
            setTimeout(() => this.monitorSendButton(), 100);
          };
          
          checkButton();
        },
        
        // 监控聊天内容变化
        monitorChatContent: function() {
          const checkContent = () => {
            // 查找所有消息元素
            const messages = document.querySelectorAll('[class*="message"], [class*="bubble"], [class*="content"]');
            const currentCount = messages.length;
            
            if (currentCount > this.lastMessageCount) {
              // 有新消息出现
              if (this.currentStatus === 'responding') {
                this.setStatus('completed');
              }
              this.lastMessageCount = currentCount;
            }
            
            setTimeout(() => this.monitorChatContent(), 500);
          };
          
          checkContent();
        },
        
        // 监控消息内容变化
        monitorMessageContent: function() {
          const checkMessageContent = () => {
            // 查找最新的消息内容元素
            const messageContentElements = document.querySelectorAll('[data-testid="message_text_content"]');
            
            if (messageContentElements.length > 0) {
              // 获取最新的消息内容元素（通常是最后一个）
              const latestMessage = messageContentElements[messageContentElements.length - 1];
              const currentContent = latestMessage.textContent || '';
              const currentLength = currentContent.length;
              
              // 检测内容变化
              if (currentLength > this.lastMessageLength) {
                // 内容长度增加，说明AI正在回复
                if (this.currentStatus !== 'responding') {
                  this.setStatus('responding');
                }
                
                // 更新最后的内容和长度
                this.lastMessageContent = currentContent;
                this.lastMessageLength = currentLength;
                
                // 清除之前的稳定计时器
                if (this.messageContentStableTimer) {
                  clearTimeout(this.messageContentStableTimer);
                  this.messageContentStableTimer = null;
                }
                
                // 设置新的稳定检测计时器
                this.messageContentStableTimer = setTimeout(() => {
                  // 内容稳定一段时间没有变化，说明AI回复完成
                  if (this.currentStatus === 'responding') {
                    this.setStatus('completed');
                  }
                }, 1500); // 1.5秒内没有内容变化认为回复完成
                
              } else if (currentLength === this.lastMessageLength && currentLength > 0) {
                // 内容长度相同但大于0，说明可能有内容替换但长度不变
                if (currentContent !== this.lastMessageContent) {
                  // 内容确实发生了变化
                  if (this.currentStatus !== 'responding') {
                    this.setStatus('responding');
                  }
                  
                  this.lastMessageContent = currentContent;
                  
                  // 清除之前的稳定计时器
                  if (this.messageContentStableTimer) {
                    clearTimeout(this.messageContentStableTimer);
                    this.messageContentStableTimer = null;
                  }
                  
                  // 设置新的稳定检测计时器
                  this.messageContentStableTimer = setTimeout(() => {
                    if (this.currentStatus === 'responding') {
                      this.setStatus('completed');
                    }
                  }, 1500);
                }
              }
            }
            
            setTimeout(() => this.monitorMessageContent(), 300);
          };
          
          checkMessageContent();
        },
        
        // 监控AI回复指示器
        monitorAIResponse: function() {
          const checkResponse = () => {
            // 检查打字指示器
            const typingIndicator = document.querySelector('[class*="typing"], [class*="loading"], [class*="thinking"]');
            const streamingText = document.querySelector('[class*="streaming"], [class*="generating"]');
            
            if ((typingIndicator && typingIndicator.style.display !== 'none') || streamingText) {
              if (this.currentStatus !== 'responding') {
                this.setStatus('responding');
              }
            }
            
            setTimeout(() => this.monitorAIResponse(), 300);
          };
          
          checkResponse();
        },
        
        // 处理按钮状态变化
        handleButtonStateChange: function(newState) {
          // 按钮从启用变为禁用 - 用户发送了消息
          if (this.lastButtonState && !this.lastButtonState.disabled && newState.disabled) {
            this.setStatus('responding');
          }
          
          // 按钮从禁用变为启用 - AI回复完成
          if (this.lastButtonState && this.lastButtonState.disabled && !newState.disabled) {
            if (this.currentStatus === 'responding') {
              this.setStatus('completed');
            }
          }
        },
        
        // 设置状态
        setStatus: function(status) {
          if (this.currentStatus === status) return;
          
          const previousStatus = this.currentStatus;
          this.currentStatus = status;
          
          switch(status) {
            case 'responding':
              this.responseStartTime = Date.now();
              console.log('⏳ AI正在回复中...');
              this.onStatusChange('ai_responding');
              break;
              
            case 'completed':
              const responseTime = Date.now() - this.responseStartTime;
              console.log('AI回复完成 (耗时: ' + responseTime + 'ms)');
              this.onStatusChange('ai_completed');
              // 短暂延迟后切换到等待输入状态
              setTimeout(() => {
                this.setStatus('waiting_input');
              }, 1000);
              break;
              
            case 'waiting_input':
              console.log('🔄 AI回复完毕，等待用户输入');
              this.onStatusChange('waiting_input');
              break;
          }
        },
        
        // 状态变化回调（可自定义）
        onStatusChange: function(status) {
          // 这里可以添加自定义逻辑
          // 例如：发送事件到其他系统、更新UI等
          
          // 通过window.postMessage发送状态变化事件
          window.postMessage({
            type: 'AI_STATUS_CHANGE',
            provider: 'doubao',
            status: status,
            timestamp: Date.now(),
            details: {
              currentStatus: this.currentStatus,
              responseStartTime: this.responseStartTime
            }
          }, '*');
          
          // 简单的控制台输出
          const statusMap = {
            'ai_responding': '🤖 AI正在回复',
            'ai_completed': '✅ AI回复完成',
            'waiting_input': '⌨️ 等待用户输入'
          };
          
          console.log('Status change: ' + (statusMap[status] || status));
        },
        
        // 获取当前状态
        getStatus: function() {
          return {
            status: this.currentStatus,
            description: this.getStatusDescription(),
            timestamp: Date.now()
          };
        },
        
        // 获取状态描述
        getStatusDescription: function() {
          const descriptions = {
            'waiting_input': 'AI回复完毕，等待用户输入',
            'responding': 'AI正在回复中',
            'completed': 'AI回复完成'
          };
          return descriptions[this.currentStatus] || '未知状态';
        },
        
        // 手动触发状态检查
        checkStatus: function() {
          const sendButton = document.querySelector('[data-testid="chat_input_send_button"], button[aria-label="发送"]');
          const textarea = document.querySelector('textarea, [role="textbox"]');
          
          if (sendButton && !sendButton.disabled && textarea && textarea.value.trim().length > 0) {
            this.setStatus('waiting_input');
          }
          
          return this.getStatus();
        }
      };
      
      // 启动监控器
      aiStatusMonitor.start();
      
      // 暴露到全局，便于调试
      window.aiStatusMonitor = aiStatusMonitor;
      
      // 返回监控器实例，便于外部调用
      return aiStatusMonitor;
    })();
  `
}

/**
 * Kimi状态监控脚本
 */
function getKimiStatusMonitorScript(): string {
  return `
    (function() {
      console.log('Kimi状态监控脚本已加载');
      // Kimi特定的状态监控逻辑
      return {
        message: 'Kimi状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
}

/**
 * Grok状态监控脚本
 */
function getGrokStatusMonitorScript(): string {
  return `
    (function() {
      console.log('Grok状态监控脚本已加载');
      // Grok特定的状态监控逻辑
      return {
        message: 'Grok状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
}

/**
 * DeepSeek状态监控脚本
 */
function getDeepSeekStatusMonitorScript(): string {
  return `
    (function() {
      console.log('DeepSeek状态监控脚本已加载');
      // DeepSeek特定的状态监控逻辑
      return {
        message: 'DeepSeek状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
}

/**
 * 通义千问状态监控脚本
 */
function getQwenStatusMonitorScript(): string {
  return `
    (function() {
      console.log('通义千问状态监控脚本已加载');
      // 通义千问特定的状态监控逻辑
      return {
        message: '通义千问状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
}

/**
 * Copilot状态监控脚本
 */
function getCopilotStatusMonitorScript(): string {
  return `
    (function() {
      console.log('Copilot状态监控脚本已加载');
      // Copilot特定的状态监控逻辑
      return {
        message: 'Copilot状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
}

/**
 * GLM状态监控脚本
 */
function getGLMStatusMonitorScript(): string {
  return `
    (function() {
      console.log('GLM状态监控脚本已加载');
      // GLM特定的状态监控逻辑
      return {
        message: 'GLM状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
}

/**
 * 元宝状态监控脚本
 */
function getYuanBaoStatusMonitorScript(): string {
  return `
    (function() {
      console.log('元宝状态监控脚本已加载');
      // 元宝特定的状态监控逻辑
      return {
        message: '元宝状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
}

/**
 * 通用状态监控脚本
 */
function getGenericStatusMonitorScript(): string {
  return `
    (function() {
      console.log('通用状态监控脚本已加载');
      // 通用状态监控逻辑
      return {
        message: '通用状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
}

/**
 * 获取所有支持的AI提供商列表
 */
export function getSupportedProviders(): string[] {
  return [
    'doubao',
    'kimi', 
    'grok',
    'deepseek',
    'qwen',
    'copilot',
    'glm',
    'yuanbao'
  ]
}

/**
 * 检查是否支持指定的AI提供商
 */
export function isProviderSupported(providerId: string): boolean {
  return getSupportedProviders().includes(providerId)
}