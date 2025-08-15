#!/usr/bin/env node

/**
 * 测试构建脚本
 * 验证项目是否可以正确构建和运行
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 开始测试项目构建...')

// 检查必要的文件是否存在
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  '.eslintrc.js',
  '.prettierrc',
  'src/main.ts',
  'src/App.vue',
  'electron/main.ts',
  'electron/preload.ts'
]

console.log('📁 检查项目文件结构...')
requiredFiles.forEach((file) => {
  if (!fs.existsSync(path.join(process.cwd(), file))) {
    console.error(`❌ 缺少必要文件: ${file}`)
    process.exit(1)
  }
})
console.log('✅ 项目文件结构检查通过')

// 检查构建输出
console.log('🔍 检查构建输出...')
const buildDirs = ['dist', 'dist-electron']
buildDirs.forEach((dir) => {
  if (!fs.existsSync(path.join(process.cwd(), dir))) {
    console.error(`❌ 缺少构建输出目录: ${dir}`)
    process.exit(1)
  }
})

const buildFiles = [
  'dist/index.html',
  'dist-electron/main.js',
  'dist-electron/preload.js'
]

buildFiles.forEach((file) => {
  if (!fs.existsSync(path.join(process.cwd(), file))) {
    console.error(`❌ 缺少构建输出文件: ${file}`)
    process.exit(1)
  }
})
console.log('✅ 构建输出检查通过')

console.log('🎉 项目初始化和基础架构搭建完成！')
console.log('')
console.log('📋 项目信息:')
console.log('  - 框架: Electron + Vue3 + TypeScript')
console.log('  - 构建工具: Vite')
console.log('  - 代码规范: ESLint + Prettier')
console.log('  - 跨平台支持: macOS + Windows 11')
console.log('')
console.log('🛠️  可用命令:')
console.log('  npm run dev        - 启动开发服务器')
console.log('  npm run build      - 构建应用')
console.log('  npm run build:mac  - 构建 macOS 版本')
console.log('  npm run build:win  - 构建 Windows 版本')
console.log('  npm run lint       - 代码检查')
console.log('  npm run format     - 代码格式化')
