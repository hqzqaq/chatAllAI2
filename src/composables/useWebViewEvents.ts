import { ref } from 'vue'

export interface WebViewEventCallbacks {
  onLoadingStart?: () => void
  onLoadingFinish?: () => void
  onError?: () => void
  onTitleChanged?: (title: string) => void
  onUrlChanged?: (url: string) => void
  onDidLoad?: () => void
}

export function useWebViewEvents(callbacks: WebViewEventCallbacks) {
  const isInitialLoad = ref(true)
  const currentUrl = ref('')

  function bindEvents(webview: Electron.WebviewTag, providerName: string) {
    webview.addEventListener('did-start-loading', () => {
      const isSignificant = isInitialLoad.value
      if (isSignificant && callbacks.onLoadingStart) {
        callbacks.onLoadingStart()
      }
    })

    webview.addEventListener('did-finish-load', () => {
      const newUrl = webview.src
      currentUrl.value = newUrl

      const wasInitialLoad = isInitialLoad.value
      const isSignificant = wasInitialLoad

      if (isSignificant && callbacks.onLoadingFinish) {
        callbacks.onLoadingFinish()
      }

      if (isSignificant && callbacks.onDidLoad) {
        callbacks.onDidLoad()
      }

      isInitialLoad.value = false
    })

    webview.addEventListener('did-fail-load', (event) => {
      if (event.errorCode === -3) return
      if (callbacks.onError) {
        callbacks.onError()
      }
    })

    webview.addEventListener('page-title-updated', (event) => {
      if (callbacks.onTitleChanged) {
        callbacks.onTitleChanged(event.title)
      }
    })

    webview.addEventListener('will-navigate', (event) => {
      if (callbacks.onUrlChanged) {
        callbacks.onUrlChanged(event.url)
      }
    })

    webview.addEventListener('new-window', (event) => {
      if (window.electronAPI) {
        window.electronAPI.openExternal(event.url)
      }
    })

    webview.addEventListener('console-message', (event) => {
      if (event.level === 0) {
        console.error(`WebView Console [${providerName}]:`, event.message)
      }
    })
  }

  function reset() {
    isInitialLoad.value = true
    currentUrl.value = ''
  }

  return { isInitialLoad, currentUrl, bindEvents, reset }
}