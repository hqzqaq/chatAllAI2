/**
 * 折叠状态管理 composable
 * 提供折叠状态的持久化存储和切换功能
 *
 * @author huquanzhi
 * @since 2026-07-17 15:00
 * @version 1.0
 */

import { ref, onMounted } from 'vue'

/**
 * 折叠状态配置接口
 */
interface UseCollapseStateOptions {
  /** localStorage 存储的 key */
  storageKey: string
  /** 默认的折叠状态 */
  defaultCollapsed?: boolean
}

/**
 * 折叠状态管理 composable 返回值接口
 */
interface UseCollapseStateReturn {
  /** 当前是否折叠 */
  isCollapsed: ReturnType<typeof ref<boolean>>
  /** 加载折叠状态（从 localStorage） */
  loadCollapsedState: () => void
  /** 保存折叠状态（到 localStorage） */
  saveCollapsedState: () => void
  /** 切换折叠状态 */
  toggleCollapse: () => void
  /** 设置折叠状态 */
  setCollapsed: (value: boolean) => void
}

/**
 * 创建折叠状态管理 composable
 * @param options 配置选项
 * @returns 折叠状态和操作方法
 */
export function useCollapseState(options: UseCollapseStateOptions): UseCollapseStateReturn {
  const { storageKey, defaultCollapsed = false } = options

  const isCollapsed = ref<boolean>(defaultCollapsed)

  /**
   * 从 localStorage 加载折叠状态
   */
  const loadCollapsedState = (): void => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) {
        isCollapsed.value = JSON.parse(stored)
      }
    } catch (error) {
      console.error('加载折叠状态失败:', error)
    }
  }

  /**
   * 保存折叠状态到 localStorage
   */
  const saveCollapsedState = (): void => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(isCollapsed.value))
    } catch (error) {
      console.error('保存折叠状态失败:', error)
    }
  }

  /**
   * 切换折叠状态
   */
  const toggleCollapse = (): void => {
    isCollapsed.value = !isCollapsed.value
    saveCollapsedState()
  }

  /**
   * 设置折叠状态
   * @param value 新的折叠状态
   */
  const setCollapsed = (value: boolean): void => {
    isCollapsed.value = value
    saveCollapsedState()
  }

  // 组件挂载时加载保存的状态
  onMounted(() => {
    loadCollapsedState()
  })

  return {
    isCollapsed,
    loadCollapsedState,
    saveCollapsedState,
    toggleCollapse,
    setCollapsed
  }
}
