<template>
  <div class="home">
    <div class="hero-section">
      <div class="hero-content">
        <div class="app-logo">
          <el-icon class="logo-icon"><ChatDotRound /></el-icon>
        </div>
        <h1 class="app-title">ChatAllAI</h1>
        <p class="app-description">多AI模型对话比较工具</p>
        <p class="app-subtitle">同时与多个AI模型对话，比较不同AI的回答</p>
        
        <div class="action-buttons">
          <el-button 
            type="primary" 
            size="large" 
            :icon="ChatDotRound"
            @click="goToChat"
          >
            开始对话
          </el-button>
          <el-button 
            size="large" 
            :icon="Setting"
            @click="goToSettings"
          >
            应用设置
          </el-button>
        </div>
      </div>
    </div>
    
    <div class="features-section">
      <div class="features-grid">
        <div class="feature-card">
          <el-icon class="feature-icon"><Connection /></el-icon>
          <h3>多AI集成</h3>
          <p>支持ChatGPT、Gemini、DeepSeek、豆包、Qwen、Copilot等主流AI模型</p>
        </div>
        
        <div class="feature-card">
          <el-icon class="feature-icon"><EditPen /></el-icon>
          <h3>统一输入</h3>
          <p>一次输入，同时发送给所有已登录的AI模型，快速比较回答</p>
        </div>
        
        <div class="feature-card">
          <el-icon class="feature-icon"><Grid /></el-icon>
          <h3>卡片布局</h3>
          <p>灵活的卡片式布局，支持拖拽调整大小，自定义界面排列</p>
        </div>
        
        <div class="feature-card">
          <el-icon class="feature-icon"><Lock /></el-icon>
          <h3>会话保持</h3>
          <p>安全保存登录状态和对话历史，重启应用后自动恢复</p>
        </div>
      </div>
    </div>
    
    <div class="status-section">
      <div class="status-info">
        <div class="status-item">
          <span class="status-label">应用版本:</span>
          <span class="status-value">{{ appVersion || '1.0.0' }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">支持平台:</span>
          <span class="status-value">macOS, Windows 11</span>
        </div>
        <div class="status-item">
          <span class="status-label">应用状态:</span>
          <el-tag :type="isInitialized ? 'success' : 'warning'" size="small">
            {{ isInitialized ? '已就绪' : '初始化中' }}
          </el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ChatDotRound, 
  Setting, 
  Connection, 
  EditPen, 
  Grid, 
  Lock 
} from '@element-plus/icons-vue'
import { useAppStore } from '../stores'

const router = useRouter()
const appStore = useAppStore()

// 计算属性
const appVersion = computed(() => appStore.appVersion)
const isInitialized = computed(() => appStore.isInitialized)

/**
 * 跳转到对话页面
 */
const goToChat = (): void => {
  router.push('/chat')
}

/**
 * 跳转到设置页面
 */
const goToSettings = (): void => {
  router.push('/settings')
}
</script>

<style scoped>
.home {
  min-height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  overflow-y: auto;
}

.hero-section {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 20px;
}

.hero-content {
  text-align: center;
  max-width: 600px;
}

.app-logo {
  margin-bottom: 24px;
}

.logo-icon {
  font-size: 80px;
  color: rgba(255, 255, 255, 0.9);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.app-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin: 0 0 16px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.app-description {
  font-size: 1.5rem;
  margin: 0 0 8px 0;
  opacity: 0.95;
}

.app-subtitle {
  font-size: 1.1rem;
  margin: 0 0 40px 0;
  opacity: 0.8;
  line-height: 1.6;
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.features-section {
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  text-align: center;
  padding: 32px 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.9);
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.feature-card p {
  font-size: 0.95rem;
  opacity: 0.85;
  line-height: 1.5;
  margin: 0;
}

.status-section {
  padding: 40px 20px;
  background: rgba(0, 0, 0, 0.1);
}

.status-info {
  display: flex;
  justify-content: center;
  gap: 32px;
  flex-wrap: wrap;
  max-width: 800px;
  margin: 0 auto;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.status-value {
  font-size: 0.9rem;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-title {
    font-size: 2.5rem;
  }
  
  .app-description {
    font-size: 1.25rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .status-info {
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  
  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
}
</style>
