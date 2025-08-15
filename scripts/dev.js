#!/usr/bin/env node

/**
 * 开发环境启动脚本
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 启动 ChatAllAI 开发环境...')
console.log('📝 提示: 使用 Ctrl+C 停止开发服务器')
console.log('')

// 设置环境变量
process.env.NODE_ENV = 'development'

// 启动 Vite 开发服务器
const viteProcess = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
})

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 正在停止开发服务器...')
  viteProcess.kill('SIGINT')
  process.exit(0)
})

viteProcess.on('close', (code) => {
  console.log(`\n✅ 开发服务器已停止 (退出码: ${code})`)
  process.exit(code)
})
