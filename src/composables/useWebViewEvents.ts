import { ref } from 'vue'

export interface WebViewEventCallbacks {
  onLoadingStart?: () => void
  onLoadingFinish?: () => void
  onError?: () => void
  onTitleChanged?: (title: string) => void
  onUrlChanged?: (url: string) => void
  onDidLoad?: () => void
}

interface WebViewEventData {
  providerId: string
  type: string
  errorCode?: number
  errorDescription?: string
  title?: string
  url?: string
  message?: string
}

export function useWebViewEvents(callbacks: WebViewEventCallbacks) {
  const isInitialLoad = ref(true)
  const currentUrl = ref('')

  function bindEvents(eventData: WebViewEventData) {
    switch (eventData.type) {
      case 'loading-start': {
        const isSignificant = isInitialLoad.value
        if (isSignificant && callbacks.onLoadingStart) {
          callbacks.onLoadingStart()
        }
        break
      }
      case 'loading-finish': {
        if (eventData.url) {
          currentUrl.value = eventData.url
        }

        const wasInitialLoad = isInitialLoad.value
        const isSignificant = wasInitialLoad

        if (isSignificant && callbacks.onLoadingFinish) {
          callbacks.onLoadingFinish()
        }

        if (isSignificant && callbacks.onDidLoad) {
          callbacks.onDidLoad()
        }

        isInitialLoad.value = false
        break
      }
      case 'loading-error': {
        if (eventData.errorCode === -3) return
        if (callbacks.onError) {
          callbacks.onError()
        }
        break
      }
      case 'title-changed': {
        if (callbacks.onTitleChanged && eventData.title) {
          callbacks.onTitleChanged(eventData.title)
        }
        break
      }
      case 'url-changed': {
        if (callbacks.onUrlChanged && eventData.url) {
          callbacks.onUrlChanged(eventData.url)
        }
        break
      }
      default:
        break
    }
  }

  function reset() {
    isInitialLoad.value = true
    currentUrl.value = ''
  }

  return {
    isInitialLoad, currentUrl, bindEvents, reset
  }
}
