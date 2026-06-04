import { watch, onUnmounted, nextTick } from 'vue'
import { useLayoutStore } from '../stores'

/**
 * 原生 WebContentsView 层级管理组合式函数
 *
 * 由于 Electron WebContentsView 是原生视图，不受 CSS z-index / visibility 控制，
 * 需要显式调用 IPC 将不需要显示的视图移到屏幕外。
 *
 * 模式定义：
 * - normal: 所有 AI 卡片视图可见
 * - sidebar-expanded: 仅总结侧边栏视图可见，AI 卡片视图隐藏
 * - card-maximized: 仅最大化的卡片视图可见，其他隐藏
 * - dialog-open: 任意 Element Plus 模态层打开，所有 AI 卡片视图隐藏（DOM 模态层在最上层）
 */
export function useViewLayering() {
  const layoutStore = useLayoutStore()

  async function setViewVisible(providerId: string, visible: boolean): Promise<void> {
    if (!window.electronAPI?.setWebViewVisibility) return
    try {
      await window.electronAPI.setWebViewVisibility({ providerId, visible })
    } catch {
      // 视图可能尚未创建，忽略错误
    }
  }

  async function syncAllViews(): Promise<void> {
    const allIds = Object.keys(layoutStore.cardConfigs)
    const state = layoutStore.viewLayerState

    // 等待 DOM 更新完成，确保隐藏的卡片样式已经生效
    await nextTick()

    // 任意模态层打开时，强制隐藏所有 AI 卡片原生视图
    if (layoutStore.dialogLayerCount > 0) {
      const promises = allIds.map((id) => setViewVisible(id, false))
      await Promise.allSettled(promises)
      return
    }

    if (state === 'normal') {
      const promises = allIds.map((id) => setViewVisible(id, true))
      await Promise.allSettled(promises)
    } else if (state === 'sidebar-expanded') {
      const promises = allIds.map((id) => setViewVisible(id, false))
      await Promise.allSettled(promises)
    } else if (state === 'card-maximized') {
      const maximizedId = layoutStore.maximizedCardId
      const promises = allIds.map((id) => setViewVisible(id, id === maximizedId))
      await Promise.allSettled(promises)
    }
  }

  const stopViewWatch = watch(
    () => [layoutStore.viewLayerState, layoutStore.maximizedCardId, layoutStore.dialogLayerCount],
    () => {
      syncAllViews()
    },
    { immediate: true }
  )

  onUnmounted(() => {
    stopViewWatch()
  })

  return {
    syncAllViews,
    setViewVisible
  }
}
