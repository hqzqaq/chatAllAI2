/**
 * 工具函数
 */

/**
 * 判断是否为开发环境
 */
export const isDev = process.env.NODE_ENV === 'development'

/**
 * 获取应用路径
 */
export const getAppPath = () => process.cwd()

/**
 * 平台检测
 */
export const platform = {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
}
