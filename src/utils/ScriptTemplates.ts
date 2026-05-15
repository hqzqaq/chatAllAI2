export const SCRIPT_TEMPLATES: Record<string, string> = {
  getLLMLastMessage: `/**
 * 获取AI最后一条回复消息
 * 
 * 此脚本在AI网站的WebView中执行，用于获取AI的最后一条回复内容。
 * 
 * 返回值: string - AI的最后一条回复文本内容，如果获取失败则返回空字符串
 * 
 * 实现要点：
 * 1. 使用document.querySelectorAll查找消息元素
 * 2. 获取最后一个消息元素的文本内容
 * 3. 返回文本内容或空字符串
 * 
 * 示例实现：
 */
(() => {
  const messages = document.querySelectorAll('.message-selector-here');
  const lastMessage = messages[messages.length - 1];
  return lastMessage ? lastMessage.textContent || '' : '';
})()`,

  loginCheck: `/**
 * 检查用户登录状态
 * 
 * 此脚本在AI网站的WebView中执行，用于检测用户是否已登录。
 * 
 * 返回值: boolean - true表示已登录，false表示未登录
 * 
 * 实现要点：
 * 1. 查找登录相关的DOM元素（如用户头像、登录按钮等）
 * 2. 根据元素的存在与否或文本内容判断登录状态
 * 3. 返回布尔值
 * 
 * 示例实现：
 */
!!document.querySelector('.user-avatar-selector-here')`,

  sendMessage: `/**
 * 发送消息到AI
 * 
 * 此脚本在AI网站的WebView中执行，用于向AI输入框填入消息并发送。
 * 
 * 参数: {message} - 将被替换为实际要发送的消息内容（已转义）
 * 
 * 返回值: boolean - true表示发送成功，false表示发送失败
 * 
 * 实现要点：
 * 1. 查找输入框元素（textarea或contenteditable div）
 * 2. 设置输入框的值
 * 3. 触发input/change事件以通知框架
 * 4. 延迟后触发发送（点击发送按钮或模拟Enter键）
 * 
 * 示例实现：
 */
(function() {
  const CHAT_INPUT_SELECTOR = 'textarea';
  const INPUT_SEND_DELAY_MS = 500;
  
  const inputElement = document.querySelector(CHAT_INPUT_SELECTOR);
  if (!inputElement) return false;
  
  inputElement.focus();
  const newValue = '{message}';
  
  try {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(inputElement, newValue);
    } else {
      inputElement.value = newValue;
    }
  } catch (e) {
    inputElement.value = newValue;
  }
  
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  
  setTimeout(() => {
    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13
    });
    inputElement.dispatchEvent(enterEvent);
  }, INPUT_SEND_DELAY_MS);
  
  return true;
})()`,

  newChat: `/**
 * 新建对话
 * 
 * 此脚本在AI网站的WebView中执行，用于创建新的对话/会话。
 * 
 * 返回值: boolean - true表示操作成功，false表示操作失败
 * 
 * 实现要点：
 * 1. 查找"新建对话"按钮并点击，或
 * 2. 使用快捷键（如Ctrl+K、Ctrl+Shift+O等）触发新建对话
 * 3. 返回操作结果
 * 
 * 示例实现（按钮点击方式）：
 */
(function() {
  try {
    const newChatButton = document.querySelector('.new-chat-button-selector');
    if (newChatButton) {
      newChatButton.click();
      return true;
    }
    return false;
  } catch (error) {
    console.error('新建对话失败:', error);
    return false;
  }
})()`,

  statusMonitor: `/**
 * AI状态监控脚本
 * 
 * 此脚本在AI网站的WebView中执行，用于监控AI是否正在回复。
 * 脚本会持续运行，通过 window.__WEBVIEW_API__.sendToHost 向主进程发送状态变化事件。
 * 
 * 参数: {providerId} - 将被替换为AI提供商ID
 * 
 * 状态类型:
 * - waiting_input: 等待用户输入
 * - ai_responding: AI正在回复
 * - ai_completed: AI回复完成
 * 
 * 实现要点：
 * 1. 使用MutationObserver监听消息内容变化
 * 2. 内容变化时发送 ai_responding 状态
 * 3. 内容稳定一段时间后发送 ai_completed 状态
 * 4. 使用 setInterval 定期检查
 * 
 * 示例实现：
 */
(function() {
  let lastStatus = '';
  let observer = null;
  let lastMessageElement = null;
  let completionTimeout = null;
  let lastMessageContent = '';

  function postStatus(status, details = {}) {
    if (status === lastStatus) return;
    lastStatus = status;
    if (window.__WEBVIEW_API__ && window.__WEBVIEW_API__.sendToHost) {
      window.__WEBVIEW_API__.sendToHost('webview-ai-status-change', {
        providerId: '{providerId}',
        status: status,
        details: details
      });
    }
    console.log('[Monitor] Status changed: ' + status);
  }

  function monitorMessage(element) {
    if (observer) observer.disconnect();
    lastMessageContent = element.textContent || '';
    observer = new MutationObserver(() => {
      const currentContent = element.textContent || '';
      if (currentContent !== lastMessageContent) {
        lastMessageContent = currentContent;
        postStatus('ai_responding');
        if (completionTimeout) clearTimeout(completionTimeout);
        completionTimeout = setTimeout(() => {
          postStatus('ai_completed');
        }, 3000);
      }
    });
    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false
    });
  }

  function checkForAIResponse() {
    const messageElements = document.querySelectorAll('.message-selector-here');
    const currentLastMessage = messageElements.length > 0 ? messageElements[messageElements.length - 1] : null;
    if (currentLastMessage) {
      if (currentLastMessage !== lastMessageElement) {
        lastMessageElement = currentLastMessage;
        monitorMessage(lastMessageElement);
        postStatus('ai_responding');
        if (completionTimeout) clearTimeout(completionTimeout);
        completionTimeout = setTimeout(() => {
          postStatus('ai_completed');
        }, 3000);
      }
    } else {
      if (lastMessageElement) {
        if (observer) observer.disconnect();
        observer = null;
        lastMessageElement = null;
        lastMessageContent = '';
        if (completionTimeout) clearTimeout(completionTimeout);
        postStatus('ai_completed');
      }
      postStatus('waiting_input');
    }
  }

  setInterval(checkForAIResponse, 3000);
  postStatus('waiting_input');
})()`
}
