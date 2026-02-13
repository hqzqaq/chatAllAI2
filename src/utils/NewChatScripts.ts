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
    yuanbao: getYuanBaoNewChatScript(),
    miromind: getMiromindNewChatScript(),
    gemini: getGeminiNewChatScript(),
    chatgpt: getChatGPTNewChatScript(),
    mimo: getMimoNewChatScript(),
    minimax: getMinimaxNewChatScript(),
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

        // 方法2: 统一使用 Ctrl+K 快捷键
        const key = 'k';
        
        // 创建更精确的键盘事件
        const eventOptions = {
          key: key,
          code: 'KeyK',
          keyCode: 75,
          which: 75,
          ctrlKey: true,
          metaKey: false,
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
        
        console.log('已发送快捷键: Ctrl+K');
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
        // 统一使用Ctrl+K快捷键
        const key = 'k';
        
        // 创建键盘事件
        const keydownEvent = new KeyboardEvent('keydown', {
          key: key,
          code: 'KeyK',
          keyCode: 75,
          which: 75,
          ctrlKey: true,
          metaKey: false,
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
          ctrlKey: true,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          bubbles: true,
          cancelable: true
        });
        
        // 发送键盘事件
        document.dispatchEvent(keydownEvent);
        document.dispatchEvent(keyupEvent);
        
        console.log('已发送快捷键: Ctrl+K');
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
        console.log('开始执行Qwen新建对话脚本...');
        
        // 方法1: 直接查找并点击新对话按钮
        console.log('尝试查找新对话按钮...');
        
        // 查找包含"新对话"文本的元素
        const findNewChatButton = () => {
          // 遍历所有元素，寻找包含"新对话"文本的元素
          const elements = document.querySelectorAll('*');
          for (const element of elements) {
            if (element.textContent && element.textContent.trim() === '新对话') {
              return element;
            }
          }
          return null;
        };
        
        const newChatTextElement = findNewChatButton();
        if (newChatTextElement) {
          console.log('找到包含"新对话"文本的元素:', newChatTextElement);
          
          // 查找它的父级按钮
          let button = newChatTextElement.closest('button');
          if (button) {
            console.log('找到新对话按钮:', button);
            
            // 模拟真实的点击事件
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
              button: 0,
              clientX: button.getBoundingClientRect().left + 10,
              clientY: button.getBoundingClientRect().top + 10,
              composed: true,
              detail: 1
            });
            
            button.dispatchEvent(clickEvent);
            console.log('已发送点击事件到新对话按钮');
            return true;
          }
        }
        
        // 方法2: 如果找不到按钮，尝试使用XPath查找
        console.log('尝试使用XPath查找新对话按钮...');
        const xpathResult = document.evaluate(
          "//*[contains(text(), '新对话')]",
          document,
          null,
          XPathResult.ANY_TYPE,
          null
        );
        
        let node = xpathResult.iterateNext();
        while (node) {
          console.log('通过XPath找到元素:', node);
          
          if (node.tagName === 'BUTTON') {
            node.click();
            console.log('已点击新对话按钮');
            return true;
          } else {
            const parentButton = node.closest('button');
            if (parentButton) {
              parentButton.click();
              console.log('已点击新对话按钮的父按钮');
              return true;
            }
          }
          
          node = xpathResult.iterateNext();
        }
        
        // 方法3: 如果按钮查找失败，尝试使用快捷键作为备选方案
        console.log('尝试使用快捷键方案...');
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const key = 'k';
        const metaKey = isMac;
        const ctrlKey = !isMac;
        
        // 创建键盘事件
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
          cancelable: true,
          composed: true,
          view: window
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
        return true;
      } catch (error) {
        console.error('Qwen新建对话脚本执行失败:', error);
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
 * miromind新建对话脚本
 */
function getMiromindNewChatScript(): string {
  return `
    (function() {
      try {
        // 检查停止按钮是否存在
        let buttons = document.querySelectorAll('.items-center.justify-center button');
        let stopButton = Array.from(buttons).find(btn => btn.textContent.trim() === '取消');
        
        if (stopButton) {
          console.log('发现停止按钮，正在停止当前对话...');
          stopButton.click();
          
          // 等待3秒后点击新建对话按钮
          setTimeout(() => {
            try {
              // 1. 拿到 header 元素
              const header = document.querySelector('header');

              if (header) {
                  // 2. 找到 header 下的第一个 div
                  const firstDiv = header.querySelector('div');
                  
                  if (firstDiv) {
                      // 3. 在这个 div 中寻找第一个 button
                      const targetButton = firstDiv.querySelector('button');
                      
                      if (targetButton) {
                          console.log('成功找到按钮:', targetButton);
                          targetButton.click();
                      }
                  }
              }
            } catch (error) {
              console.error('点击新建对话按钮失败:', error);
            }
          }, 3000);
          
          return true;
        } else {
          // 如果没有停止按钮，直接点击新建对话按钮
          // 1. 拿到 header 元素
          const header = document.querySelector('header');

          if (header) {
              // 2. 找到 header 下的第一个 div
              const firstDiv = header.querySelector('div');
              
              if (firstDiv) {
                  // 3. 在这个 div 中寻找第一个 button
                  const targetButton = firstDiv.querySelector('button');
                  
                  if (targetButton) {
                      console.log('成功找到按钮:', targetButton);
                      targetButton.click();
                      return true;
                  }
              }
          }
          
          console.log('未找到新建对话按钮');
          return false;
        }
      } catch (error) {
        console.error('miromind新建对话失败:', error);
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

/**
 * Gemini新建对话脚本
 */
function getGeminiNewChatScript(): string {
  return `
    (function() {
      try {
        // 精准选择Gemini的新建对话按钮
        const newChatButton = document.querySelector('[data-test-id="side-nav-action-button-icon"]');
        
        if (newChatButton) {
          newChatButton.click();
          console.log('已点击Gemini新建对话按钮');
          return true;
        }
        
        console.log('未找到可见的新建对话按钮');
        return false;
      } catch (error) {
        console.error('Gemini新建对话失败:', error);
        return false;
      }
    })()
  `
}

/**
 * ChatGPT新建对话脚本
 */
function getChatGPTNewChatScript(): string {
  return `
    (function() {
      try {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const key = 'o';
        const ctrlKey = !isMac;
        const metaKey = isMac;
        const shiftKey = true;
        
        const keydownEvent = new KeyboardEvent('keydown', {
          key: key,
          code: 'KeyO',
          keyCode: 79,
          which: 79,
          ctrlKey: ctrlKey,
          metaKey: metaKey,
          altKey: false,
          shiftKey: shiftKey,
          bubbles: true,
          cancelable: true
        });
        
        const keyupEvent = new KeyboardEvent('keyup', {
          key: key,
          code: 'KeyO',
          keyCode: 79,
          which: 79,
          ctrlKey: ctrlKey,
          metaKey: metaKey,
          altKey: false,
          shiftKey: shiftKey,
          bubbles: true,
          cancelable: true
        });
        
        document.dispatchEvent(keydownEvent);
        document.dispatchEvent(keyupEvent);
        
        console.log('已发送快捷键: ' + (isMac ? 'Command+Shift+O' : 'Ctrl+Shift+O'));
        return true;
      } catch (error) {
        console.error('发送快捷键失败:', error);
        return false;
      }
    })()
  `
}


/**
 * mimo新建对话脚本
 */
function getMimoNewChatScript(): string {
  return `
    (function() {
      try {
        const newButton = document.querySelector('[aria-label="开始新对话"]');
        
        if (newButton) {
          newButton.click();
          console.log('已点击mimo新建对话按钮');
          return true;
        } else {
          console.log('未找到新建对话按钮');
          return false;
        }
      } catch (error) {
        console.error('发送快捷键失败:', error);
        return false;
      }
    })()
  `
}

/**
 * minimax新建对话脚本
 */
function getMinimaxNewChatScript(): string {
  return `
    (function() {
      try {
        const key = 'k';
        
        // 创建更精确的键盘事件
        const eventOptions = {
          key: key,
          code: 'KeyK',
          keyCode: 75,
          which: 75,
          ctrlKey: true,
          metaKey: false,
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
        
        console.log('已发送快捷键: Ctrl+K');
        if(expandButton) {
          expandButton.click();
        }
        return true;
      } catch (error) {
        console.error('Minimax新建会话失败:', error);
        return false;
      }
    })()
  `
}
