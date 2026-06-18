import { ref } from 'vue'

export function useSessionPersistence(providerName: string, getOriginalProviderId: () => string) {
  const sessionLoaded = ref(false)
  const saveSessionTimer = ref<NodeJS.Timeout | null>(null)

  async function saveSession(): Promise<void> {
    if (!window.electronAPI) return

    try {
      await window.electronAPI.saveSession({ providerId: getOriginalProviderId() })
      console.log(`Session saved for ${providerName}`)
    } catch (error) {
      console.warn(`Failed to save session for ${providerName}:`, error)
    }
  }

  async function loadSession(): Promise<boolean> {
    if (!window.electronAPI || sessionLoaded.value) return false

    sessionLoaded.value = true

    try {
      const response = await window.electronAPI.loadSession({ providerId: getOriginalProviderId() })
      if (response.exists && response.sessionData) {
        console.log(`Session loaded for ${providerName}`)
        return true
      }
      return false
    } catch (error) {
      console.warn(`Failed to load session for ${providerName}:`, error)
      return false
    }
  }

  function startSaveSessionTimer(isLoggedIn: () => boolean) {
    if (saveSessionTimer.value) return

    saveSessionTimer.value = setInterval(
      () => {
        if (isLoggedIn()) {
          saveSession()
        }
      },
      15 * 60 * 1000
    )
  }

  function stopSaveSessionTimer() {
    if (saveSessionTimer.value) {
      clearInterval(saveSessionTimer.value)
      saveSessionTimer.value = null
    }
  }

  return {
    sessionLoaded,
    saveSessionTimer,
    saveSession,
    loadSession,
    startSaveSessionTimer,
    stopSaveSessionTimer
  }
}
