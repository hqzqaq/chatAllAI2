module.exports = {
  appId: 'com.chatallai.app',
  productName: 'ChatAllAI',
  directories: {
    output: 'dist'
  },
  files: [
    'dist-electron/**/*',
    'dist/**/*',
    '!**/node_modules/**/*',
    '!**/tests/**/*',
    '!**/docs/**/*',
    '!**/examples/**/*',
    '!**/.*',
    'node_modules/@element-plus/icons-vue/**/*',
    'node_modules/element-plus/**/*',
    'node_modules/pinia/**/*',
    'node_modules/vue/**/*',
    'node_modules/vue-router/**/*'
  ],
  extraResources: [],
  extraFiles: [],
  mac: {
    category: 'public.app-category.productivity',
    target: [
      {
        target: 'dmg',
        arch: [
          'x64',
          'arm64'
        ]
      },
      {
        target: 'zip',
        arch: [
          'x64',
          'arm64'
        ]
      }
    ],
    icon: 'public/icons/chatallai.png',
    // 移除不必要的框架和组件
    ignore: [
      '**/Electron Framework.framework/Versions/A/Helpers/**',
      '**/Electron Framework.framework/Versions/A/Resources/**',
      '**/*Helper (GPU).app/**',
      '**/*Helper (Renderer).app/**',
      '**/ReactiveObjC.framework/**',
      '**/Squirrel.framework/**',
      '**/Mantle.framework/**'
    ]
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: [
          'x64'
        ]
      }
    ],
    icon: 'public/icons/chatallai.png'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  },
  compression: 'maximum',
  // 移除调试信息
  removePackageScripts: true,
  // 最小化文件
  asar: {
    smartUnpack: false
  }
}
