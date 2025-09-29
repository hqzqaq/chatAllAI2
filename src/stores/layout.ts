import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CardConfig } from '../types'

/**
 * 布局状态管理
 */
export const useLayoutStore = defineStore('layout', () => {
  // 卡片配置
  const cardConfigs = ref<Record<string, CardConfig>>({})

  // 网格布局设置
  const gridSettings = ref({
    columns: 3,
    gap: 16,
    minCardWidth: 300,
    minCardHeight: 1000
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

  const cardWidth = computed(() => (availableWidth.value - gridSettings.value.gap * (gridSettings.value.columns - 1)) / gridSettings.value.columns)

  const cardHeight = computed(() => gridSettings.value.minCardHeight)

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
      cardConfigs.value[providerId].isMinimized = !cardConfigs.value[providerId].isMinimized
      // 重新计算布局以适应最小化状态
      recalculateLayout()
      saveLayoutConfig()
    }
  }

  /**
     * 更新窗口尺寸
     */
  const updateWindowSize = (width: number, height: number): void => {
    windowSize.value = { width, height }

    // 根据窗口大小自动调整网格列数
    if (width < 800) {
      gridSettings.value.columns = 1
    } else if (width < 1200) {
      gridSettings.value.columns = 2
    } else {
      gridSettings.value.columns = 3
    }

    // 重新计算卡片布局
    recalculateLayout()
  }

  /**
   * 重新计算布局
   */
  const recalculateLayout = (): void => {
    const visibleCards = Object.values(cardConfigs.value).filter((config) => config.isVisible)

    visibleCards.forEach((config, index) => {
      const col = index % gridSettings.value.columns
      const row = Math.floor(index / gridSettings.value.columns)

      config.position = {
        x: col * (cardWidth.value + gridSettings.value.gap) + gridSettings.value.gap,
        y: row * (cardHeight.value + gridSettings.value.gap) + gridSettings.value.gap
      }

      if (!config.isMinimized) {
        config.size = {
          width: cardWidth.value,
          height: cardHeight.value
        }
      } else {
        // 最小化状态下，保持宽度但设置较小的高度
        config.size = {
          width: cardWidth.value,
          height: 60 // 最小化后的高度
        }
      }
    })
    saveLayoutConfig()
  }

  /**
     * 更新网格设置并重新计算布局
     */
  const updateGridSettings = (newSettings: Partial<typeof gridSettings.value>): void => {
    gridSettings.value = { ...gridSettings.value, ...newSettings }
    recalculateLayout()
  }

  /**
     * 重置布局
     */
  const resetLayout = (): void => {
    const providerIds = Object.keys(cardConfigs.value)
    cardConfigs.value = {}
    initializeCardConfigs(providerIds)
  }

  /**
     * 保存布局配置
     */
  const saveLayoutConfig = (): void => {
    try {
      const config = {
        cardConfigs: cardConfigs.value,
        gridSettings: gridSettings.value
      }
      localStorage.setItem('layoutConfig', JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save layout config:', error)
    }
  }

  /**
     * 加载布局配置
     */
  const loadLayoutConfig = (): void => {
    try {
      const saved = localStorage.getItem('layoutConfig')
      if (saved) {
        const config = JSON.parse(saved)
        if (config.cardConfigs) {
          cardConfigs.value = config.cardConfigs
        }
        if (config.gridSettings) {
          gridSettings.value = { ...gridSettings.value, ...config.gridSettings }
        }
      }
    } catch (error) {
      console.error('Failed to load layout config:', error)
    }
  }

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

  return {
    cardConfigs,
    gridSettings,
    windowSize,
    showGrid,
    availableWidth,
    availableHeight,
    cardWidth,
    cardHeight,
    initializeCardConfigs,
    updateCardPosition,
    updateCardSize,
    toggleCardVisibility,
    toggleCardMinimized,
    updateWindowSize,
    recalculateLayout,
    resetLayout,
    saveLayoutConfig,
    loadLayoutConfig,
    getCardConfig,
    updateCardTitle
  }
})
