/**
 * 文件操作处理器
 * 处理文件相关的IPC通信，如文件选择、读取、上传到WebView等
 */

import { IpcMainInvokeEvent, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import {
  IPCChannel,
  FileOpenDialogRequest,
  FileOpenDialogResponse,
  FileReadRequest,
  FileReadResponse,
  FileUploadToWebViewRequest,
  FileUploadToWebViewResponse
} from '../../../src/types/ipc'
import { getFileUploadScript } from '../../../src/utils/UploadScripts'
import { BaseIPCHandler, IWindowManager, ILogger } from './types'

export class FileOperationHandler extends BaseIPCHandler {
  private windowManager: IWindowManager

  constructor(windowManager: IWindowManager, logger?: ILogger) {
    super(logger)
    this.windowManager = windowManager
  }

  protected getHandlerName(): string {
    return 'FileOperationHandler'
  }

  getChannels(): IPCChannel[] {
    return [
      IPCChannel.FILE_OPEN_DIALOG,
      IPCChannel.FILE_READ,
      IPCChannel.FILE_UPLOAD_TO_WEBVIEW
    ]
  }

  async handleInvoke(channel: IPCChannel, data: any, event: IpcMainInvokeEvent): Promise<any> {
    return this.executeSafely(async() => {
      switch (channel) {
        case IPCChannel.FILE_OPEN_DIALOG:
          return this.handleFileOpenDialog(data)
        case IPCChannel.FILE_READ:
          return this.handleFileRead(data)
        case IPCChannel.FILE_UPLOAD_TO_WEBVIEW:
          return this.handleFileUploadToWebView(data)
        default:
          throw new Error(`Unknown channel: ${channel}`)
      }
    }, `FileOperationHandler.handleInvoke(${channel})`)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleSend(channel: IPCChannel, data: any, event: any): void {
    // 文件操作不需要send类型的通道
  }

  /**
   * 打开文件选择对话框
   */
  private async handleFileOpenDialog(data: FileOpenDialogRequest): Promise<FileOpenDialogResponse> {
    const mainWindow = this.windowManager.getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { canceled: true, filePaths: [] }
    }

    const options: {
      properties: Array<'openFile' | 'multiSelections'>
      filters: Array<{ name: string; extensions: string[] }>
    } = {
      properties: ['openFile'],
      filters: data.filters || [
        {
          name: 'All Supported Files',
          extensions: [
            'txt', 'md', 'json', 'csv', 'py', 'js', 'ts', 'html', 'css', 'xml',
            'yaml', 'yml', 'log', 'sql', 'java', 'go', 'rs', 'c', 'cpp', 'h',
            'hpp', 'sh', 'bat', 'ps1', 'ini', 'cfg', 'conf', 'toml', 'properties',
            'env', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp',
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'zip', 'rar', '7z', 'tar', 'gz'
          ]
        }
      ]
    }

    if (data.multiSelections) {
      (options.properties as string[]).push('multiSelections')
    }

    this.logger.info('Opening file dialog')
    const result = await dialog.showOpenDialog(mainWindow, options)
    return {
      canceled: result.canceled,
      filePaths: result.filePaths
    }
  }

  /**
   * 读取文件内容并返回base64
   */
  private async handleFileRead(data: FileReadRequest): Promise<FileReadResponse> {
    try {
      const { filePath } = data
      this.logger.info(`Reading file: ${filePath}`)

      const buffer = fs.readFileSync(filePath)
      const base64 = buffer.toString('base64')
      const ext = path.extname(filePath).toLowerCase().replace('.', '')

      const mimeMap: Record<string, string> = {
        txt: 'text/plain',
        md: 'text/markdown',
        json: 'application/json',
        csv: 'text/csv',
        xml: 'application/xml',
        html: 'text/html',
        css: 'text/css',
        js: 'application/javascript',
        ts: 'application/typescript',
        py: 'text/x-python',
        java: 'text/x-java',
        go: 'text/x-go',
        rs: 'text/x-rust',
        sql: 'text/sql',
        yaml: 'text/yaml',
        yml: 'text/yaml',
        sh: 'text/x-shellscript',
        bat: 'text/plain',
        ps1: 'text/plain',
        ini: 'text/plain',
        cfg: 'text/plain',
        conf: 'text/plain',
        toml: 'text/plain',
        log: 'text/plain',
        env: 'text/plain',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        bmp: 'image/bmp',
        svg: 'image/svg+xml',
        webp: 'image/webp',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        zip: 'application/zip',
        rar: 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        tar: 'application/x-tar',
        gz: 'application/gzip'
      }

      return {
        success: true,
        name: path.basename(filePath),
        size: buffer.length,
        mimeType: mimeMap[ext] || 'application/octet-stream',
        base64
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error('Failed to read file:', errorMessage)
      return {
        success: false,
        name: '',
        size: 0,
        mimeType: '',
        base64: '',
        error: errorMessage
      }
    }
  }

  /**
   * 上传文件到WebView
   */
  private async handleFileUploadToWebView(
    data: FileUploadToWebViewRequest
  ): Promise<FileUploadToWebViewResponse> {
    const { webviewId, providerId, file } = data
    this.logger.info(
      `[FileUpload:Main] START provider=${providerId} `
      + `webviewId=${webviewId} file=${file.name} size=${file.size} type=${file.mimeType}`
    )
    this.logger.info(`[FileUpload:Main] base64 length=${file.base64.length}`)

    try {
      const script = getFileUploadScript(providerId, {
        name: file.name,
        mimeType: file.mimeType,
        base64: file.base64
      })

      const debugScript = script.replace(/\n/g, ' ').substring(0, 300)
      this.logger.info(`[FileUpload:Main] Generated script (first 300 chars): ${debugScript}`)

      // 注意：这里需要调用WebViewHandler的executeInWebViewContainer方法
      // 由于职责分离，这里只生成脚本，实际的执行由调用方处理
      // 或者可以通过事件机制通知WebViewHandler执行

      this.logger.info('[FileUpload:Main] Script generated successfully')
      return { success: true, providerId, script }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const stack = error instanceof Error ? error.stack : ''
      this.logger.error(`[FileUpload:Main] ERROR: ${errorMessage}`)
      this.logger.error(`[FileUpload:Main] Stack: ${stack}`)
      return { success: false, providerId, error: errorMessage }
    }
  }
}
