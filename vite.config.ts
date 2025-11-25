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
        args: ['--remote-debugging-port=9222'],
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
    outDir: outDir,
    assetsDir: 'assets',
    sourcemap: false,
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          elementPlus: ['element-plus', '@element-plus/icons-vue']
        }
      }
    }
  }
})
