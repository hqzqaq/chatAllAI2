import { ref } from 'vue'
import { getLoginCheckScript } from '../utils/LoginCheckScripts'
import type { AIProvider } from '../types'

export function useLoginCheck(provider: AIProvider) {
  const loginCheckTimer = ref<NodeJS.Timeout | null>(null)

  async function checkLoginStatus(): Promise<boolean> {
    if (!window.electronAPI) return false

    try {
      let isLoggedIn = false

      if (provider.id === 'chatgpt' || provider.id === 'gemini-studio') {
        isLoggedIn = true
      } else {
        const providerId = provider.id.startsWith('summary-')
          ? provider.id.replace('summary-', '')
          : provider.id
        const loginCheckScript = getLoginCheckScript(providerId)
        const result = await window.electronAPI.executeWebViewScript({
          providerId: provider.id,
          script: loginCheckScript
        })
        isLoggedIn = Boolean(result)
      }

      return isLoggedIn
    } catch (error) {
      console.warn(`Failed to check login status for ${provider.name}:`, error)
      return false
    }
  }

  function startLoginCheckTimer(
    providerIdFn: () => string,
    isLoading: { value: boolean },
    onLoggedIn: () => Promise<void>
  ) {
    if (loginCheckTimer.value) return

    // 记录上一次登录状态，仅在从未登录变为已登录时触发回调，
    // 避免已登录后每 10 秒重复调用（如重复保存 session）
    let wasLoggedIn = false

    loginCheckTimer.value = setInterval(() => {
      const currentProviderId = providerIdFn()
      if (currentProviderId && !isLoading.value) {
        checkLoginStatus().then((isLoggedIn) => {
          if (isLoggedIn && !wasLoggedIn) {
            onLoggedIn()
          }
          wasLoggedIn = isLoggedIn
        })
      }
    }, 10 * 1000)
  }

  function stopLoginCheckTimer() {
    if (loginCheckTimer.value) {
      clearInterval(loginCheckTimer.value)
      loginCheckTimer.value = null
    }
  }

  return {
    checkLoginStatus, startLoginCheckTimer, stopLoginCheckTimer, loginCheckTimer
  }
}
