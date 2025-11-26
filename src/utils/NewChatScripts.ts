/**
 * 新建对话脚本工具类
 * 提供不同AI网站的新建对话脚本
 *
 * @author huquanzhi
 * @since 2024-12-19 14:30
 * @version 1.0
 */

/**
 * 获取新建对话的脚本
 * @param providerId AI提供商ID
 * @returns 对应的JavaScript脚本字符串
 */
export function getNewChatScript(providerId: string): string {
  const scripts: Record<string, string> = {
    kimi: getKimiNewChatScript(),
    grok: getGrokNewChatScript(),
    deepseek: getDeepSeekNewChatScript(),
    doubao: getDouBaoNewChatScript(),
    qwen: getQwenNewChatScript(),
    copilot: getCopilotNewChatScript(),
    glm: getGLMNewChatScript(),
    yuanbao: getYuanBaoNewChatScript()
  }

  return scripts[providerId] || getGenericNewChatScript()
}

/**
 * kimi新建对话脚本
 */
function getKimiNewChatScript(): string {
  return `
    (function() {
      try {
        // 方法1: 优先尝试点击侧边栏隐藏时的新建会话按钮（加号图标）
        const addButton = document.querySelectorAll('[class="icon-button expand-btn"]')[1];
        if (addButton) {
          addButton.click();
          console.log('已点击侧边栏隐藏时的新建会话按钮');
          return true;
        }
        
        // 点击侧边栏
        const expandButton = document.querySelector('[class="icon-button expand-btn"]');
        if(expandButton) {
          expandButton.click();
        }

        // 方法2: 如果找不到按钮和链接，尝试改进的键盘事件
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const key = 'k';
        const metaKey = isMac;
        const ctrlKey = !isMac;
        
        // 创建更精确的键盘事件
        const eventOptions = {
          key: key,
          code: 'KeyK',
          keyCode: 75,
          which: 75,
          ctrlKey: ctrlKey,
          metaKey: metaKey,
          altKey: false,
          shiftKey: false,
          bubbles: true,
          cancelable: true
        };
        
        // 尝试在多个目标上发送事件
        const targets = [
          document.activeElement,
          document.querySelector('input, textarea'),
          document.body,
          document
        ];
        
        for (const target of targets) {
          if (target) {
            try {
              target.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
              target.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
              console.log('已在目标上发送快捷键:', target);
            } catch (e) {
              console.log('目标事件发送失败:', target, e);
            }
          }
        }
        
        console.log('已发送快捷键: ' + (isMac ? 'Command+K' : 'Ctrl+K'));
        if(expandButton) {
          expandButton.click();
        }
        return true;
      } catch (error) {
        console.error('Kimi新建会话失败:', error);
        return false;
      }
    })()
  `
}

/**
 * yuanbao新建对话脚本
 */
function getYuanBaoNewChatScript(): string {
  return `
    (function() {
      // 精准查找腾讯元宝新建对话按钮
      const newChatButtons = document.querySelectorAll('.yb-common-nav__trigger');
      
      for (let button of newChatButtons) {
        // 验证是否包含新建对话图标
        const hasNewChatIcon = button.querySelector('.yb-icon.icon-yb-ic_newchat_20');
        if (hasNewChatIcon) {
          button.click();
          console.log('已点击新建对话按钮');
          return true;
        }
      }
      
      console.log('未找到新建对话按钮');
      return false;
    })()
  `
}

/**
 * grok新建对话脚本
 */
function getGrokNewChatScript(): string {
  return getDeepSeekNewChatScript()
}

/**
 * GLM新建对话脚本
 */
function getGLMNewChatScript(): string {
  return `
    (function() {
      try {
        // 精准选择智谱清言的新建对话按钮
        const newChatButton = document.querySelector('.create-text');
        
        if (newChatButton && newChatButton.offsetParent !== null) {
          newChatButton.click();
          console.log('已点击GLM新建对话按钮');
          return true;
        }
        
        console.log('未找到可见的新建对话按钮');
        return false;
      } catch (error) {
        console.error('GLM新建对话失败:', error);
        return false;
      }
    })()
  `
}

/**
 * DeepSeek新建对话脚本
 */
function getDeepSeekNewChatScript(): string {
  return `
    (function() {
      try {
        // 检测平台并设置相应的快捷键
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const key = 'j';
        const ctrlKey = !isMac;
        const metaKey = isMac;
        
        // 创建键盘事件
        const keydownEvent = new KeyboardEvent('keydown', {
          key: key,
          code: 'KeyJ',
          keyCode: 74,
          which: 74,
          ctrlKey: ctrlKey,
          metaKey: metaKey,
          altKey: false,
          shiftKey: false,
          bubbles: true,
          cancelable: true
        });
        
        const keyupEvent = new KeyboardEvent('keyup', {
          key: key,
          code: 'KeyJ',
          keyCode: 74,
          which: 74,
          ctrlKey: ctrlKey,
          metaKey: metaKey,
          altKey: false,
          shiftKey: false,
          bubbles: true,
          cancelable: true
        });
        
        // 发送键盘事件
        document.dispatchEvent(keydownEvent);
        document.dispatchEvent(keyupEvent);
        
        console.log('已发送快捷键: ' + (isMac ? 'Command+J' : 'Ctrl+J'));
        return true;
      } catch (error) {
        console.error('发送快捷键失败:', error);
        return false;
      }
    })()
  `
}

/**
 * doubao新建对话脚本
 */
function getDouBaoNewChatScript(): string {
  return `
    (function() {
      try {
        // 检测平台并设置相应的快捷键
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const key = 'k';
        const ctrlKey = !isMac;
        const metaKey = isMac;
        
        // 创建键盘事件
        const keydownEvent = new KeyboardEvent('keydown', {
          key: key,
          code: 'KeyK',
          keyCode: 75,
          which: 75,
          ctrlKey: ctrlKey,
          metaKey: metaKey,
          altKey: false,
          shiftKey: false,
          bubbles: true,
          cancelable: true
        });
        
        const keyupEvent = new KeyboardEvent('keyup', {
          key: key,
          code: 'KeyK',
          keyCode: 75,
          which: 75,
          ctrlKey: ctrlKey,
          metaKey: metaKey,
          altKey: false,
          shiftKey: false,
          bubbles: true,
          cancelable: true
        });
        
        // 发送键盘事件
        document.dispatchEvent(keydownEvent);
        document.dispatchEvent(keyupEvent);
        
        console.log('已发送快捷键: ' + (isMac ? 'Command+K' : 'Ctrl+K'));
        return true;
      } catch (error) {
        console.error('发送快捷键失败:', error);
        return false;
      }
    })()
  `
}

/**
 * qwen新建对话脚本
 */
function getQwenNewChatScript(): string {
  return `
    (function() {
      try {
        // 方法1: 优先尝试点击侧边栏隐藏时的新建对话按钮（加号图标）
        // 通义网站可能有类似Kimi的侧边栏结构
        const addButtons = document.querySelectorAll('[class*="icon"][class*="button"], [class*="add"], [class*="new"]');
        for (let i = 0; i < addButtons.length; i++) {
          const btn = addButtons[i];
          const btnText = btn.textContent || btn.innerText || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          
          // 检查是否是新建对话相关的按钮
          if (btnText.includes('新建') || btnText.includes('新对话') || btnText.includes('+') || 
              ariaLabel.includes('新建') || ariaLabel.includes('新对话') || ariaLabel.includes('new')) {
            btn.click();
            console.log('已点击新建对话按钮:', btn);
            return true;
          }
        }
        
        return false
      } catch (error) {
        console.error('通义新建对话失败:', error);
        return false;
      }
    })()
  `
}

/**
 * copilot新建对话脚本
 */
function getCopilotNewChatScript(): string {
  return `
    (function() {
      try {
        // 精准选择Copilot的新建对话按钮
        const newChatButton = document.querySelector('[aria-label="开始新聊天"]');
        
        if (newChatButton) {
          newChatButton.click();
          console.log('已点击Copilot新建对话按钮');
          return true;
        }
        
        console.log('未找到可见的新建对话按钮');
        return false;
      } catch (error) {
        console.error('Copilot新建对话失败:', error);
        return false;
      }
    })()
  `
}

/**
 * 通用新建对话脚本
 */
function getGenericNewChatScript(): string {
  return `
    (function() {
      // 通用新建对话脚本模板
      // 尝试查找新建对话按钮
      const newChatButtons = [
        document.querySelector('[data-testid="new-chat-button"]'),
        document.querySelector('[aria-label*="new chat"]'),
        document.querySelector('[aria-label*="新建对话"]'),
        document.querySelector('button:contains("New chat")'),
        document.querySelector('button:contains("新建对话")'),
        document.querySelector('.new-chat'),
        document.querySelector('#new-chat')
      ].filter(Boolean)
      
      if (newChatButtons.length > 0) {
        newChatButtons[0].click()
        console.log('已点击新建对话按钮')
        return true
      } else {
        console.log('未找到新建对话按钮，尝试其他方式')
        // 后续将添加针对具体网站的实现
        return false
      }
    })()
  `
}
