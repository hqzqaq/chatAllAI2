import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

// 动态输出目录
const outDir = process.env.VITE_OUT_DIR || 'dist'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        // 主进程入口文件
        entry: 'electron/main.ts',
        onstart(options) {
          if (options.startup) {
            options.startup()
          }
        },
        vite: {
          build: {
            sourcemap: false,
            minify: false,
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        // 预加载脚本
        entry: 'electron/preload.ts',
        onstart(options) {
          // 通知渲染进程重新加载页面
          options.reload()
        },
        vite: {
          build: {
            sourcemap: false,
            minify: false,
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        // 新的WebView预加载脚本
        entry: 'electron/webview-preload.ts',
        vite: {
          build: {
            sourcemap: false,
            minify: false,
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    // 使用 electron 渲染进程
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir,
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vue生态系统
          vue: ['vue', 'vue-router', 'pinia'],
          // Element Plus UI库
          elementPlus: ['element-plus', '@element-plus/icons-vue'],
          // 其他第三方库
          vendor: []
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // 添加对 assetInfo.names 的检查
          if (!assetInfo.names || assetInfo.names.length === 0) {
            // 如果 names 不存在或为空，返回默认路径
            return 'assets/[name]-[hash].[ext]'
          }
          const info = assetInfo.names
          const extType = info[info.length - 1]
          for (const key in assetInfo.names) {
            if (/\.(png|jpe?g|gif|svg)(\?.*)?$/.test(key)) {
              return `images/[name]-[hash].${extType}`
            }
            if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(key)) {
              return `fonts/[name]-[hash].${extType}`
            }
          }
          return `assets/[name]-[hash].${extType}`
        }
      },
      external: ['electron']
    },
    target: 'es2015',
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000
  }
})
