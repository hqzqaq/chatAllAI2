<template>
  <div class="script-editor">
    <div class="editor-header">
      <h3 class="editor-title">
        脚本配置
      </h3>
    </div>

    <div class="editor-controls">
      <div class="control-row">
        <div class="control-item">
          <label class="control-label">脚本类型</label>
          <el-select
            v-model="scriptType"
            placeholder="选择脚本类型"
            class="control-select"
          >
            <el-option
              v-for="item in SCRIPT_TYPES"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>

        <div class="control-item">
          <label class="control-label">AI提供商</label>
          <el-select
            v-model="providerId"
            placeholder="选择AI提供商"
            class="control-select"
            filterable
          >
            <el-option
              v-for="item in PROVIDERS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>

        <div class="control-item status-item">
          <label class="control-label">状态</label>
          <el-tag
            :type="isCustom ? 'warning' : 'info'"
            size="large"
          >
            {{ isCustom ? '已自定义' : '使用默认' }}
          </el-tag>
        </div>
      </div>
    </div>

    <div class="editor-body">
      <el-input
        v-model="editorContent"
        type="textarea"
        :rows="20"
        :placeholder="isCustom ? '编辑自定义脚本内容...' : '使用内置默认脚本，点击查看模板查看参考'"
        class="script-textarea"
        resize="vertical"
      />
    </div>

    <div class="editor-footer">
      <div class="footer-left">
        <el-button
          type="primary"
          :disabled="!hasChanges"
          @click="handleSave"
        >
          保存
        </el-button>
        <el-button
          :disabled="!isCustom"
          @click="handleReset"
        >
          重置为默认
        </el-button>
      </div>
      <div class="footer-right">
        <el-button @click="handleViewTemplate">
          查看模板
        </el-button>
        <el-button @click="handleImport">
          导入配置
        </el-button>
        <el-button @click="handleExport">
          导出配置
        </el-button>
      </div>
    </div>

    <el-dialog
      v-model="templateDialogVisible"
      :title="`模板 - ${currentScriptLabel}`"
      width="700px"
      :close-on-click-modal="true"
    >
      <div class="template-content">
        <el-input
          :model-value="currentTemplate"
          type="textarea"
          :rows="25"
          readonly
          class="template-textarea"
        />
      </div>
      <template #footer>
        <el-button @click="templateDialogVisible = false">
          关闭
        </el-button>
        <el-button
          type="primary"
          @click="handleUseTemplate"
        >
          使用此模板
        </el-button>
      </template>
    </el-dialog>

    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileImport"
    >
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useScriptConfigStore } from '../../stores/scriptConfig'
import { SCRIPT_TYPES } from '../../types'
import { SCRIPT_TEMPLATES } from '../../utils/ScriptTemplates'
import type { ScriptType, ScriptConfigExport } from '../../types'

const PROVIDERS = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'doubao', label: '豆包' },
  { value: 'qwen', label: '通义千问' },
  { value: 'kimi', label: 'Kimi' },
  { value: 'grok', label: 'Grok' },
  { value: 'copilot', label: 'Copilot' },
  { value: 'glm', label: 'GLM' },
  { value: 'yuanbao', label: '元宝' },
  { value: 'miromind', label: 'MiroThinker' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'mimo', label: 'mimo' },
  { value: 'minimax', label: 'Minimax' }
]

const scriptConfigStore = useScriptConfigStore()

const scriptType = ref<ScriptType>('getLLMLastMessage')
const providerId = ref('deepseek')
const editorContent = ref('')
const templateDialogVisible = ref(false)
const fileInputRef = ref<HTMLInputElement>()

const isCustom = computed(() => scriptConfigStore.isCustomized(providerId.value, scriptType.value))

const savedContent = computed(() => scriptConfigStore.getCustomScript(providerId.value, scriptType.value) || '')

const hasChanges = computed(() => {
  if (isCustom.value) {
    return editorContent.value !== savedContent.value
  }
  return editorContent.value.trim() !== ''
})

const currentScriptLabel = computed(() => {
  const found = SCRIPT_TYPES.find((t) => t.value === scriptType.value)
  return found ? found.label : scriptType.value
})

const currentTemplate = computed(() => SCRIPT_TEMPLATES[scriptType.value] || '')

const validateJavaScript = (code: string): { valid: boolean; error?: string } => {
  if (!code.trim()) {
    return { valid: true }
  }
  try {
    // eslint-disable-next-line no-new, no-new-func
    new Function(code)
    return { valid: true }
  } catch (e) {
    return { valid: false, error: (e as Error).message }
  }
}

const loadEditorContent = () => {
  const custom = scriptConfigStore.getCustomScript(providerId.value, scriptType.value)
  editorContent.value = custom || ''
}

const handleSave = () => {
  const content = editorContent.value.trim()
  if (!content) {
    ElMessage.warning('脚本内容不能为空')
    return
  }

  const validation = validateJavaScript(content)
  if (!validation.valid) {
    ElMessageBox.confirm(
      `脚本语法检查未通过：${validation.error}，是否仍然保存？`,
      '语法警告',
      {
        confirmButtonText: '仍然保存',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      scriptConfigStore.saveCustomScript(providerId.value, scriptType.value, content)
      ElMessage.success('保存成功')
    }).catch(() => {
      ElMessage.info('已取消保存')
    })
    return
  }

  scriptConfigStore.saveCustomScript(providerId.value, scriptType.value, content)
  ElMessage.success('保存成功')
}

const handleReset = async() => {
  try {
    const providerLabel = PROVIDERS.find((p) => p.value === providerId.value)?.label || providerId.value
    await ElMessageBox.confirm(
      `确定要将 "${currentScriptLabel.value}" (${providerLabel}) 重置为默认脚本吗？`,
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    scriptConfigStore.resetCustomScript(providerId.value, scriptType.value)
    editorContent.value = ''
    ElMessage.success('已重置为默认脚本')
  } catch {
    ElMessage.info('已取消重置')
  }
}

const handleViewTemplate = () => {
  templateDialogVisible.value = true
}

const handleUseTemplate = () => {
  editorContent.value = currentTemplate.value
  templateDialogVisible.value = false
  ElMessage.success('模板已加载到编辑器，修改后请点击保存')
}

const handleExport = () => {
  try {
    const config = scriptConfigStore.exportConfig()
    const data = JSON.stringify(config, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `script-config-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

const handleImport = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target?.result as string) as ScriptConfigExport

      if (!importedData || !importedData.customScripts || typeof importedData.customScripts !== 'object') {
        ElMessage.error('导入文件格式错误')
        return
      }

      const providerCount = Object.keys(importedData.customScripts).length
      ElMessageBox.confirm(
        `确定要导入 ${providerCount} 个提供商的脚本配置吗？这将与现有配置合并。`,
        '确认导入',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        const success = scriptConfigStore.importConfig(importedData)
        if (success) {
          loadEditorContent()
          ElMessage.success('导入成功')
        } else {
          ElMessage.error('导入失败，配置格式无效')
        }
      }).catch(() => {
        ElMessage.info('已取消导入')
      })
    } catch (error) {
      console.error('导入失败:', error)
      ElMessage.error('导入失败，文件格式错误')
    }
  }
  reader.readAsText(file)

  if (target) {
    target.value = ''
  }
}

watch([scriptType, providerId], () => {
  loadEditorContent()
})

loadEditorContent()
</script>

<style scoped lang="css">
.script-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  gap: 16px;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.editor-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.editor-controls {
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
}

.control-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 180px;
}

.status-item {
  flex: 0;
  min-width: auto;
}

.control-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.control-select {
  width: 100%;
}

.editor-body {
  flex: 1;
  min-height: 0;
}

.script-textarea :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  background-color: #1e1e1e;
  color: #d4d4d4;
  border-color: #3c3c3c;
  padding: 16px;
}

.script-textarea :deep(.el-textarea__inner):focus {
  border-color: var(--el-color-primary);
}

.script-textarea :deep(.el-textarea__inner)::placeholder {
  color: #6a6a6a;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color);
}

.footer-left,
.footer-right {
  display: flex;
  gap: 8px;
}

.template-content {
  max-height: 600px;
  overflow-y: auto;
}

.template-textarea :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  background-color: #1e1e1e;
  color: #d4d4d4;
  border-color: #3c3c3c;
  padding: 16px;
}

.template-content::-webkit-scrollbar {
  width: 6px;
}

.template-content::-webkit-scrollbar-track {
  background: var(--el-fill-color-light);
  border-radius: 3px;
}

.template-content::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

.template-content::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker);
}

@media (max-width: 768px) {
  .script-editor {
    padding: 12px;
  }

  .control-row {
    flex-direction: column;
  }

  .control-item {
    min-width: 100%;
  }

  .editor-footer {
    flex-direction: column;
    gap: 8px;
  }

  .footer-left,
  .footer-right {
    width: 100%;
    justify-content: center;
  }
}
</style>
