import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { CardConfig } from '../types'
import { storage } from '../utils/storage'

/**
 * 布局状态管理
 */
export const useLayoutStore = defineStore('layout', () => {
  // 卡片配置
  const cardConfigs = ref<Record<string, CardConfig>>({})

  /**
   * 原生视图层级状态
   * - normal: 所有 AI 卡片原生视图可见
   * - sidebar-expanded: 侧边栏展开，AI 卡片原生视图隐藏
   * - card-maximized: 某张卡片最大化，仅该卡片原生视图可见
   */
  const viewLayerState = ref<'normal' | 'sidebar-expanded' | 'card-maximized'>('normal')

  /**
   * 当前最大化的卡片 ID，无最大化卡片时为 null
   */
  const maximizedCardId = ref<string | null>(null)

  /**
   * 打开的模态层（Dialog）数量
   * 任何 Element Plus el-dialog 打开时需要 +1，关闭时需要 -1
   * 当 > 0 时，原生 AI 卡片视图会被全部隐藏，避免遮挡 DOM 模态层
   */
  const dialogLayerCount = ref<number>(0)

  // 网格布局设置 - 移除行数限制
  const gridSettings = ref({
    columns: 3,
    gap: 16,
    minCardWidth: 300,
    minCardHeight: 600 // 最小高度600px，提供更大显示空间
  })

  // 窗口尺寸
  const windowSize = ref({
    width: window.innerWidth,
    height: window.innerHeight
  })

  // 是否显示布局网格
  const showGrid = ref(false)

  // 计算属性
  const availableWidth = computed(() => windowSize.value.width - gridSettings.value.gap * 2)
  const availableHeight = computed(() => windowSize.value.height - gridSettings.value.gap * 2)

  const cardWidth = computed(() => {
    const available = availableWidth.value - gridSettings.value.gap * 2 // 减去左右边距
    return Math.max(
      (available - gridSettings.value.gap * (gridSettings.value.columns - 1)) / gridSettings.value.columns,
      gridSettings.value.minCardWidth
    )
  })

  const cardHeight = computed(() => Math.max(gridSettings.value.minCardHeight, 600)) // 确保卡片高度至少为400px

  /**
   * 初始化卡片配置
   */
  const initializeCardConfigs = (providerIds: string[]): void => {
    providerIds.forEach((providerId, index) => {
      if (!cardConfigs.value[providerId]) {
        const row = Math.floor(index / gridSettings.value.columns)
        const col = index % gridSettings.value.columns

        cardConfigs.value[providerId] = {
          id: `card-${providerId}`,
          providerId,
          position: {
            x: col * (cardWidth.value + gridSettings.value.gap) + gridSettings.value.gap,
            y: row * (cardHeight.value + gridSettings.value.gap) + gridSettings.value.gap
          },
          size: {
            width: cardWidth.value,
            height: cardHeight.value
          },
          isVisible: true,
          isMinimized: false,
          isMaximized: false,
          zIndex: 1,
          title: providerId
        }
      }
    })
  }

  /**
   * 更新卡片位置
   */
  const updateCardPosition = (providerId: string, position: { x: number; y: number }): void => {
    if (cardConfigs.value[providerId]) {
      cardConfigs.value[providerId].position = position
      saveLayoutConfig()
    }
  }

  /**
   * 更新卡片尺寸
   */
  const updateCardSize = (providerId: string, size: { width: number; height: number }): void => {
    if (cardConfigs.value[providerId]) {
      // 确保最小尺寸
      const newSize = {
        width: Math.max(size.width, gridSettings.value.minCardWidth),
        height: Math.max(size.height, gridSettings.value.minCardHeight)
      }
      cardConfigs.value[providerId].size = newSize
      saveLayoutConfig()
    }
  }

  /**
   * 切换卡片可见性
   */
  const toggleCardVisibility = (providerId: string): void => {
    if (cardConfigs.value[providerId]) {
      cardConfigs.value[providerId].isVisible = !cardConfigs.value[providerId].isVisible
      saveLayoutConfig()
    }
  }

  /**
   * 最小化/恢复卡片
   */
  const toggleCardMinimized = (providerId: string): void => {
    if (cardConfigs.value[providerId]) {
      // 如果卡片已经最大化，先恢复再最小化
      if (cardConfigs.value[providerId].isMaximized) {
        restoreCardFromMaximized(providerId)
      }
      cardConfigs.value[providerId].isMinimized = !cardConfigs.value[providerId].isMinimized
      // 重新计算布局以适应最小化状态
      recalculateLayout()
      saveLayoutConfig()
    }
  }

  /**
   * 最大化卡片
   */
  const maximizeCard = (providerId: string): void => {
    if (cardConfigs.value[providerId]) {
      const config = cardConfigs.value[providerId]

      // 保存原始状态
      config.originalSize = {
        width: typeof config.size.width === 'number' ? config.size.width : parseInt(config.size.width, 10) || 800,
        height: typeof config.size.height === 'number' ? config.size.height : parseInt(config.size.height, 10) || 600
      }
      config.originalPosition = { ...config.position }

      // 设置最大化状态
      config.isMaximized = true
      config.isMinimized = false

      // 设置最大化尺寸和位置
      config.size = {
        width: windowSize.value.width - 32, // 减去边距
        height: windowSize.value.height - 120 // 减去头部和输入区域高度
      }
      config.position = {
        x: 16, // 左边距
        y: 16 // 上边距
      }
      config.zIndex = 200 // 最大化卡片使用最高 z-index

      // 设置其他卡片为隐藏状态（但不销毁WebView）
      Object.keys(cardConfigs.value).forEach((id) => {
        if (id !== providerId) {
          cardConfigs.value[id].isHidden = true // 使用isHidden而不是isVisible
        }
      })

      // 更新原生视图层级状态
      viewLayerState.value = 'card-maximized'
      maximizedCardId.value = providerId

      saveLayoutConfig()
    }
  }

  /**
   * 恢复卡片从最大化状态
   */
  const restoreCardFromMaximized = (providerId: string): void => {
    if (cardConfigs.value[providerId]) {
      const config = cardConfigs.value[providerId]

      if (config.isMaximized && config.originalSize && config.originalPosition) {
        // 恢复原始状态
        config.size = { ...config.originalSize }
        config.position = { ...config.originalPosition }
        config.isMaximized = false
        config.zIndex = 1

        // 删除保存的原始状态
        delete config.originalSize
        delete config.originalPosition

        // 显示所有卡片（清除隐藏状态）
        Object.keys(cardConfigs.value).forEach((id) => {
          cardConfigs.value[id].isHidden = false
        })

        // 重置原生视图层级状态
        viewLayerState.value = 'normal'
        maximizedCardId.value = null

        // 重新计算布局
        recalculateLayout()
        saveLayoutConfig()
      }
    }
  }

  /**
   * 切换卡片最大化状态
   */
  const toggleCardMaximized = (providerId: string): void => {
    if (cardConfigs.value[providerId]) {
      if (cardConfigs.value[providerId].isMaximized) {
        restoreCardFromMaximized(providerId)
      } else {
        maximizeCard(providerId)
      }
    }
  }

  /**
   * 更新窗口尺寸
   */
  const updateWindowSize = (width: number, height: number): void => {
    windowSize.value = { width, height }

    // 更新最大化卡片的尺寸适配新窗口
    if (viewLayerState.value === 'card-maximized' && maximizedCardId.value) {
      const maximizedConfig = cardConfigs.value[maximizedCardId.value]
      if (maximizedConfig) {
        maximizedConfig.size = {
          width: width - 32,
          height: height - 120
        }
      }
      return
    }

    // 根据窗口大小自动调整网格列数，但不覆盖用户手动设置
    if (width < 800) {
      gridSettings.value.columns = Math.min(gridSettings.value.columns, 1)
    } else if (width < 1200) {
      gridSettings.value.columns = Math.min(gridSettings.value.columns, 2)
    }

    // 重新计算卡片布局
    recalculateLayout()
  }

  /**
   * 重新计算布局 - 支持自动扩展行数，无行数限制
   * 跳过已隐藏的卡片和最大化卡片
   */
  const recalculateLayout = (): void => {
    const visibleCards = Object.values(cardConfigs.value).filter(
      (config) => config.isVisible && !config.isMaximized && !config.isHidden
    )

    visibleCards.forEach((config, index) => {
      const col = index % gridSettings.value.columns
      const row = Math.floor(index / gridSettings.value.columns)

      Object.assign(config, {
        position: {
          x: col * (cardWidth.value + gridSettings.value.gap) + gridSettings.value.gap,
          y: row * (cardHeight.value + gridSettings.value.gap) + gridSettings.value.gap
        }
      })

      if (!config.isMinimized) {
        Object.assign(config, {
          size: {
            width: cardWidth.value,
            height: cardHeight.value
          }
        })
      } else {
        Object.assign(config, {
          size: {
            width: cardWidth.value,
            height: 60
          }
        })
      }
    })
    saveLayoutConfig()
  }

  /**
   * 更新网格设置并重新计算布局 - 移除行数相关逻辑
   */
  const updateGridSettings = (newSettings: Partial<typeof gridSettings.value>): void => {
    const oldSettings = { ...gridSettings.value }
    gridSettings.value = { ...gridSettings.value, ...newSettings }

    // 如果列数发生变化，重新计算布局
    if (newSettings.columns !== undefined) {
      // 重新计算所有卡片布局，支持无限制行数
      recalculateLayout()
    }
    saveLayoutConfig()
  }

  /**
   * 重置布局
   */
  const resetLayout = (): void => {
    const providerIds = Object.keys(cardConfigs.value)
    cardConfigs.value = {}
    initializeCardConfigs(providerIds)
  }

  const saveLayoutConfig = (): void => {
    const config = {
      cardConfigs: cardConfigs.value,
      gridSettings: gridSettings.value
    }
    storage.set('chatallai_layout_config', config)
  }

  const loadLayoutConfig = (): void => {
    const config = storage.get<any>('chatallai_layout_config')
    if (config) {
      if (config.cardConfigs) {
        cardConfigs.value = config.cardConfigs
      }
      if (config.gridSettings) {
        gridSettings.value = { ...gridSettings.value, ...config.gridSettings }
      }
    }
  }

  watch(
    [cardConfigs, gridSettings],
    () => {
      saveLayoutConfig()
    },
    { deep: true }
  )

  loadLayoutConfig()

  /**
   * 获取卡片配置
   */
  const getCardConfig = (providerId: string): CardConfig | undefined => cardConfigs.value[providerId]

  /**
   * 更新卡片标题
   */
  const updateCardTitle = (providerId: string, title: string): void => {
    if (cardConfigs.value[providerId]) {
      cardConfigs.value[providerId].title = title
      saveLayoutConfig()
    }
  }

  /**
   * 侧边栏展开时调用：隐藏所有 AI 卡片原生视图
   */
  const onSidebarExpand = (): void => {
    if (viewLayerState.value !== 'card-maximized') {
      viewLayerState.value = 'sidebar-expanded'
    }
  }

  /**
   * 侧边栏收起时调用：恢复 AI 卡片原生视图
   */
  const onSidebarCollapse = (): void => {
    if (viewLayerState.value === 'sidebar-expanded') {
      viewLayerState.value = 'normal'
    }
  }

  /**
   * 注册一个模态层（Dialog）打开
   * 多个 dialog 嵌套打开时通过引用计数管理，全部关闭后才会恢复 AI 卡片视图
   */
  const pushDialogLayer = (): void => {
    dialogLayerCount.value += 1
  }

  /**
   * 注销一个模态层（Dialog）关闭
   * 引用计数做最小值保护，避免异常路径导致计数为负
   */
  const popDialogLayer = (): void => {
    if (dialogLayerCount.value > 0) {
      dialogLayerCount.value -= 1
    }
  }

  return {
    cardConfigs,
    gridSettings,
    windowSize,
    showGrid,
    availableWidth,
    availableHeight,
    cardWidth,
    cardHeight,
    viewLayerState,
    maximizedCardId,
    dialogLayerCount,
    initializeCardConfigs,
    updateCardPosition,
    updateCardSize,
    toggleCardVisibility,
    toggleCardMinimized,
    maximizeCard,
    restoreCardFromMaximized,
    toggleCardMaximized,
    updateWindowSize,
    updateGridSettings,
    recalculateLayout,
    resetLayout,
    saveLayoutConfig,
    loadLayoutConfig,
    getCardConfig,
    updateCardTitle,
    onSidebarExpand,
    onSidebarCollapse,
    pushDialogLayer,
    popDialogLayer
  }
})
