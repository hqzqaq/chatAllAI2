import { watch, onUnmounted, nextTick } from 'vue'
import { useLayoutStore } from '../stores'
import { useWebViewBoundsScheduler } from './useWebViewBoundsScheduler'

/**
 * 原生 WebContentsView 层级管理组合式函数
 *
 * 由于 Electron WebContentsView 是原生视图，不受 CSS z-index / visibility 控制，
 * 需要显式调用 IPC 将不需要显示的视图移到屏幕外。
 *
 * Task 5 改造：显隐控制统一经由调度器的 setOverride 单一信号源驱动，
 * 不再直接调用 setWebViewVisibility IPC，避免与 WebView.vue 的 computeBounds 路径竞态。
 *
 * 模式定义：
 * - normal: 所有 AI 卡片视图可见
 * - sidebar-expanded: 仅总结侧边栏视图可见，AI 卡片视图隐藏
 * - card-maximized: 仅最大化的卡片视图可见，其他隐藏
 * - dialog-open: 任意 Element Plus 模态层打开，所有 AI 卡片视图隐藏（DOM 模态层在最上层）
 */
export function useViewLayering() {
  const layoutStore = useLayoutStore()
  // 通过调度器单一信号源驱动显隐，避免直接 IPC 调用与 computeBounds 路径竞态
  const scheduler = useWebViewBoundsScheduler()

  async function syncAllViews(): Promise<void> {
    const allIds = Object.keys(layoutStore.cardConfigs)
    const state = layoutStore.viewLayerState

    // 等待 DOM 更新完成，确保隐藏的卡片样式已经生效
    await nextTick()

    // 任意模态层打开时：强制隐藏所有原生视图，不暂停调度器，
    // 确保 visible=false 的 IPC 能真正下发给主进程
    if (layoutStore.dialogLayerCount > 0) {
      allIds.forEach((id) => scheduler.setOverride(id, false))
      return
    }

    if (state === 'normal') {
      // 正常状态：清除所有覆盖，由 computeBounds 自行计算显隐
      allIds.forEach((id) => scheduler.setOverride(id, null))
    } else if (state === 'sidebar-expanded') {
      // 侧边栏展开：强制隐藏所有 AI 卡片
      allIds.forEach((id) => scheduler.setOverride(id, false))
    } else if (state === 'card-maximized') {
      // 最大化：仅最大化卡片由 computeBounds 计算其位置，其他强制隐藏
      const maximizedId = layoutStore.maximizedCardId
      allIds.forEach((id) => {
        if (id === maximizedId) {
          scheduler.setOverride(id, null)
        } else {
          scheduler.setOverride(id, false)
        }
      })
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
    syncAllViews
  }
}
