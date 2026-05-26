#!/usr/bin/env node

/**
 * 生产环境启动脚本
 * 启动应用但不显示Electron默认头部元素
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 启动 ChatAllAI 生产环境...')
console.log('📝 提示: 使用 Ctrl+C 停止应用')
console.log('')

// 设置环境变量
process.env.NODE_ENV = 'production'

// 使用不同的输出目录避免文件锁定问题
console.log('📦 构建前端资源到临时目录...')
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const viteBuild = spawn(npmCmd, ['exec', '--no', 'vite', 'build', '--outDir', 'dist-prod'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
})

viteBuild.on('close', (viteCode) => {
  if (viteCode !== 0) {
    console.error('❌ 前端构建失败')
    process.exit(viteCode)
  }

  console.log('✅ 前端构建完成')

  // 启动Electron应用
  console.log('🔧 启动Electron应用...')
  const electronProcess = spawn(npmCmd, ['exec', '--no', 'electron', '.'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
    env: { ...process.env, VITE_OUT_DIR: 'dist-prod' }
  })

  // 处理进程退出
  process.on('SIGINT', () => {
    console.log('\n🛑 正在停止应用...')
    electronProcess.kill('SIGINT')
    process.exit(0)
  })

  electronProcess.on('close', (electronCode) => {
    console.log(`\n✅ 应用已停止 (退出码: ${electronCode})`)
    process.exit(electronCode)
  })
})
