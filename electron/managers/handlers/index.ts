/**
 * IPC处理器模块导出
 * 集中导出所有处理器类和类型定义
 */

// 基础类型和接口
export {
  IIPCHandler,
  BaseIPCHandler,
  IWindowManager,
  ISessionManager,
  IPCHandlerConfig,
  ILogger,
  ConsoleLogger,
  IPCError,
  IPCErrorHandler
} from './types'

// 应用控制处理器
export { AppControlHandler } from './AppControlHandler'

// 窗口控制处理器
export { WindowControlHandler } from './WindowControlHandler'

// WebView管理处理器
export { WebViewHandler } from './WebViewHandler'

// 会话管理处理器
export { SessionHandler } from './SessionHandler'

// 消息处理处理器
export { MessageHandler, IMessageSender } from './MessageHandler'

// 文件操作处理器
export { FileOperationHandler } from './FileOperationHandler'
