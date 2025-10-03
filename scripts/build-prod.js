#!/usr/bin/env node

/**
 * 生产环境构建脚本
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🏗️  开始构建 ChatAllAI 生产版本...')
console.log('')

// 设置生产环境变量
process.env.NODE_ENV = 'production'

// 构建Vite应用
console.log('📦 构建前端资源...')
const viteBuild = spawn('npx', ['vite', 'build'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
})

viteBuild.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ 前端构建失败')
    process.exit(code)
  }
  
  console.log('✅ 前端构建完成')
  
  // 构建Electron应用
  console.log('🔧 构建Electron应用...')
  const electronBuild = spawn('npx', ['electron-builder', '--publish=never'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  })
  
  electronBuild.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Electron构建失败')
      process.exit(code)
    }
    
    console.log('✅ 生产版本构建完成！')
    console.log('📁 安装包位置: dist/')
    process.exit(0)
  })
})

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 正在停止构建...')
  process.exit(0)
})