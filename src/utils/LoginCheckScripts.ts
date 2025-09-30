/**
 * 登录状态检查脚本工具类
 * 提供不同AI网站的登录状态检查脚本
 *
 * @author huquanzhi
 * @since 2024-12-19 14:30
 * @version 1.0
 */

/**
 * 获取登录状态检查脚本
 * @param providerId AI提供商ID
 * @returns 对应的JavaScript脚本字符串
 */
export function getLoginCheckScript(providerId: string): string {
  const scripts: Record<string, string> = {
    kimi: `
      // 检查是否存在用户头像或登录相关元素
      !!(document.querySelector('[data-testid="profile-button"]') ||
         document.querySelector('.flex.items-center.gap-2') ||
         document.querySelector('[aria-label*="User"]'))
    `,
    gemini: `
      // 检查Gemini的登录状态
      !!(document.querySelector('[data-ved]') ||
         document.querySelector('.gb_d') ||
         document.querySelector('[aria-label*="Account"]'))
    `,
    deepseek: `
      // 检查DeepSeek的登录状态
      !!(document.querySelector('.user-avatar') ||
         document.querySelector('.login-user') ||
         document.querySelector('[class*="avatar"]') ||
         document.querySelector('.ds-icon'))
    `,
    doubao: `
      // 检查豆包的登录状态
      !!(document.querySelector("[data-testid='chat_header_avatar_button']"))
    `,
    qwen: `
      // 检查通义千问的登录状态
      !Array.from(document.querySelectorAll('button'))
        .some(btn => btn.textContent.trim() === '立即登录')
    `,
    copilot: `
      // 检查Copilot的登录状态
      !!(document.querySelector('[data-testid="user-menu"]') ||
         document.querySelector('.user-profile') ||
         document.querySelector('[aria-label*="Profile"]'))
    `
  }

  return scripts[providerId] || 'false'
}
