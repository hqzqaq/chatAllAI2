/**
 * WebContentsView 统一 Bounds 调度器
 *
 * 用单一 requestAnimationFrame 循环替代每个 WebView 实例独立的 rAF 循环，
 * 通过 diff 机制仅在状态真正变化时下发 IPC，降低主线程压力与跨进程通信开销。
 *
 * 设计要点：
 * - 模块级单例：所有 WebView 实例共享同一个调度循环
 * - diff 下发：bounds 或 visible 任一变化才下发 IPC，静止时不下发
 * - 显隐覆盖：支持外部强制覆盖某个 webview 的可见性（供 useViewLayering 使用）
 * - 暂停/恢复：dialog 打开期间暂停 IPC 下发，但保留内部状态缓存
 */

/** 原生视图的位置和尺寸（窗口客户区坐标） */
export interface WebViewBoundsState {
  bounds: { x: number; y: number; width: number; height: number }
  /** 是否可见 */
  visible: boolean
}

/**
 * 计算函数：返回当前 webview 应处的状态
 * 返回 null 表示该 webview 暂时不参与调度（如未创建完成）
 */
export type BoundsGetter = () => WebViewBoundsState | null

/** 单个 webview 的调度条目 */
interface SchedulerEntry {
  /** 状态计算函数 */
  getter: BoundsGetter
  /** 上一次下发的状态缓存，用于 diff 比较 */
  lastState: WebViewBoundsState | null
}

/* =========================================================================
 * 模块级单例状态（所有 WebView 共享，声明于 useWebViewBoundsScheduler 之外）
 * ========================================================================= */

/** 已注册的 webview 条目：id -> entry */
const entries = new Map<string, SchedulerEntry>()

/** 显隐覆盖表：id -> 强制的 visible 值（true=强制可见，false=强制隐藏） */
const overrides = new Map<string, boolean>()

/** 当前 rAF 句柄，null 表示循环已停止 */
let rafId: number | null = null

/** 是否暂停 IPC 下发（暂停期间仍更新内部缓存，但不下发 IPC） */
let paused = false

/** 标记下一帧是否需要执行调度（由 scheduleImmediate 置位，tick 内清除） */
let scheduled = false

/* =========================================================================
 * 内部辅助函数
 * ========================================================================= */

/**
 * 逐字段比较两组 bounds 是否完全相同
 * 避免使用 JSON.stringify 带来的序列化开销
 * @param a 第一组 bounds
 * @param b 第二组 bounds
 */
function boundsEqual(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

/**
 * 判断是否需要下发 IPC
 * - current 为 null：不参与调度，不下发
 * - last 为 null 且 current 非 null：首次下发
 * - bounds 或 visible 任一变化：下发
 * - 其余情况（静止）：不下发
 * @param last 上一次下发的状态缓存
 * @param current 当前计算出的状态
 */
function shouldSendIPC(
  last: WebViewBoundsState | null,
  current: WebViewBoundsState | null
): boolean {
  if (current === null) return false
  if (last === null) return true
  if (last.visible !== current.visible) return true
  if (!boundsEqual(last.bounds, current.bounds)) return true
  return false
}

/**
 * rAF 循环主体
 * 遍历所有条目：调用 getter -> 应用 override -> diff -> 下发 IPC（暂停时跳过） -> 更新缓存
 */
function tick(): void {
  // 安全保护：未被调度时直接停止，避免空转
  if (!scheduled) {
    rafId = null
    return
  }
  scheduled = false

  // 遍历所有条目：调用 getter -> 应用 override -> diff -> 下发 IPC（暂停时跳过） -> 更新缓存
  // 使用 forEach 而非 for...of，符合项目 no-restricted-syntax 规范（避免迭代器运行时开销）
  entries.forEach((entry, id) => {
    // 1. 调用 getter 获取当前状态；异常时当作 null，不影响其他条目
    let currentState: WebViewBoundsState | null
    try {
      currentState = entry.getter()
    } catch {
      currentState = null
    }

    // 2. 应用显隐覆盖：若存在 override，强制覆盖 visible 字段
    const overrideVisible = overrides.get(id)
    if (currentState !== null && overrideVisible !== undefined) {
      currentState = { ...currentState, visible: overrideVisible }
    }

    // 3. diff 判断是否需要下发 IPC
    if (shouldSendIPC(entry.lastState, currentState)) {
      // 4. 未暂停时下发 IPC；暂停期间跳过 IPC 但仍会更新下方缓存
      if (!paused && currentState !== null) {
        const api = window.electronAPI?.updateWebViewState
        if (api) {
          api({
            providerId: id,
            bounds: currentState.bounds,
            visible: currentState.visible
          }).catch(() => {
            // 忽略 IPC 错误（视图可能尚未创建或已销毁）
          })
        }
      }
    }

    // 5. 更新 lastState 缓存（无论是否暂停、是否下发 IPC 都更新）
    // 直接修改 entry.lastState 为热路径零分配写入，与项目既有模式一致
    // eslint-disable-next-line no-param-reassign
    entry.lastState = currentState
  })

  // 6. 决定下一帧：有 entries 且未暂停时继续循环；否则停止以释放主线程。
  //    注：pause() 不会取消已调度的当前帧，当前帧仍会完成上述缓存更新；
  //    后续帧不再调度，直到 resume() 通过 scheduleImmediate 重启循环。
  if (entries.size > 0 && !paused) {
    scheduled = true
    rafId = requestAnimationFrame(tick)
  } else {
    rafId = null
  }
}

/* =========================================================================
 * 调度器 API（模块级单例实现）
 * ========================================================================= */

/**
 * 注册一个 webview 实例及其状态计算函数
 * 注册后立即触发一次调度，确保首帧位置尽快同步
 * @param id webview 唯一标识（通常为 providerId）
 * @param getter 状态计算函数，返回当前应处的 bounds 与 visible
 */
function register(id: string, getter: BoundsGetter): void {
  entries.set(id, { getter, lastState: null })
  scheduleImmediate()
}

/**
 * 注销一个 webview 实例
 * 会向主进程下发 visible=false 以避免原生视图卸载后残留
 * @param id webview 唯一标识
 */
function unregister(id: string): void {
  entries.delete(id)
  overrides.delete(id)
  // 无论是否暂停，都强制隐藏该原生视图，避免卸载后残留
  const api = window.electronAPI?.updateWebViewState
  if (api) {
    api({ providerId: id, visible: false }).catch(() => {
      // 忽略 IPC 错误（视图可能已不存在）
    })
  }
}

/**
 * 请求下一帧立即执行一次调度（用于 scroll/resize 事件触发）
 * 若 rAF 循环未运行则启动，避免重复注册回调
 */
function scheduleImmediate(): void {
  scheduled = true
  if (rafId === null) {
    rafId = requestAnimationFrame(tick)
  }
}

/**
 * 设置某个 id 的显隐覆盖（用于 useViewLayering 统一显隐）
 * 设置后触发一次调度以尽快生效
 * @param id webview 唯一标识
 * @param visible true=强制可见，false=强制隐藏，null=清除覆盖恢复由 getter 计算
 */
function setOverride(id: string, visible: boolean | null): void {
  if (visible === null) {
    overrides.delete(id)
  } else {
    overrides.set(id, visible)
  }
  scheduleImmediate()
}

/**
 * 暂停 IPC 下发（dialog 打开期间）
 * 不取消已调度的当前帧（该帧仍会调用 getter 更新 lastState 缓存，但跳过 IPC）；
 * 后续帧不再调度，直到 resume() 触发。
 */
function pause(): void {
  paused = true
}

/**
 * 恢复 IPC 下发，并立即触发一次调度
 * 触发的 tick 会将缓存与当前状态 diff 后一次性下发变更
 */
function resume(): void {
  paused = false
  scheduleImmediate()
}

/**
 * WebContentsView 统一 Bounds 调度器（模块级单例）
 *
 * 多次调用返回同一组共享 API，所有 WebView 共享同一个 rAF 循环。
 * 调度器为纯逻辑层，不依赖 Vue 响应式系统，也不引入项目内其他模块。
 */
export function useWebViewBoundsScheduler() {
  return {
    register,
    unregister,
    scheduleImmediate,
    setOverride,
    pause,
    resume
  }
}
