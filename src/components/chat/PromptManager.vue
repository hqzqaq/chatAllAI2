<template>
  <div class="prompt-manager">
    <el-dialog
      v-model="dialogVisible"
      title="Prompt 管理器"
      width="90%"
      :close-on-click-modal="false"
      class="prompt-manager-dialog"
    >
      <div class="prompt-manager-content">
        <div class="prompt-sidebar">
          <div class="sidebar-header">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索 prompt..."
              :prefix-icon="Search"
              clearable
              class="search-input"
            />
            <el-button
              type="primary"
              :icon="Plus"
              @click="handleCreate"
            >
              新建 Prompt
            </el-button>
          </div>

          <div class="category-filter">
            <el-radio-group
              v-model="selectedCategory"
              size="small"
            >
              <el-radio-button label="all">
                全部
              </el-radio-button>
              <el-radio-button label="favorite">
                收藏
              </el-radio-button>
              <el-radio-button
                v-for="category in categories"
                :key="category"
                :label="category"
              >
                {{ category }}
              </el-radio-button>
            </el-radio-group>
          </div>

          <div class="prompt-list">
            <div
              v-for="prompt in filteredPrompts"
              :key="prompt.id"
              class="prompt-item"
              :class="{ active: selectedPromptId === prompt.id }"
              draggable="true"
              @click="handleSelectPrompt(prompt)"
              @dblclick="handleApplyPrompt(prompt)"
              @dragstart="handleDragStart($event, prompt)"
              @dragover="handleDragOver($event)"
              @drop="handleDrop($event, prompt)"
            >
              <div class="prompt-item-header">
                <el-icon class="drag-handle">
                  <Rank />
                </el-icon>
                <span class="prompt-name">{{ prompt.name }}</span>
                <el-icon
                  class="favorite-icon"
                  :class="{ active: prompt.isFavorite }"
                  @click.stop="toggleFavorite(prompt)"
                >
                  <Star />
                </el-icon>
              </div>
              <div class="prompt-item-preview">
                {{ prompt.content.substring(0, 50) }}...
              </div>
              <div class="prompt-item-footer">
                <el-tag
                  size="small"
                  type="info"
                >
                  {{ prompt.category }}
                </el-tag>
                <el-tag
                  size="small"
                  type="success"
                >
                  {{ prompt.useCount }} 次使用
                </el-tag>
              </div>
            </div>
          </div>
        </div>

        <div class="prompt-main">
          <div
            v-if="selectedPrompt"
            class="prompt-detail"
          >
            <div class="detail-header">
              <h3>{{ selectedPrompt.name }}</h3>
              <div class="detail-actions">
                <el-button
                  type="primary"
                  :icon="Position"
                  @click="handleApplyPrompt(selectedPrompt)"
                >
                  应用到输入框
                </el-button>
                <el-button
                  :icon="Edit"
                  @click="handleEdit(selectedPrompt)"
                >
                  编辑
                </el-button>
                <el-button
                  :icon="Share"
                  @click="handleShare(selectedPrompt)"
                >
                  分享
                </el-button>
                <el-button
                  type="danger"
                  :icon="Delete"
                  @click="handleDelete(selectedPrompt)"
                >
                  删除
                </el-button>
              </div>
            </div>

            <div class="detail-meta">
              <el-tag>{{ selectedPrompt.category }}</el-tag>
              <el-tag type="info">
                创建于 {{ formatDate(selectedPrompt.createdAt) }}
              </el-tag>
              <el-tag type="success">
                使用次数: {{ selectedPrompt.useCount }}
              </el-tag>
              <el-tag type="warning">
                最后使用: {{ formatDate(selectedPrompt.lastUsedAt) }}
              </el-tag>
            </div>

            <div class="detail-content">
              <h4>Prompt 内容</h4>
              <div class="content-editor">
                <el-input
                  v-model="selectedPrompt.content"
                  type="textarea"
                  :rows="10"
                  placeholder="输入 prompt 内容，可以使用 {{user_input}} 作为替换符..."
                  @input="handleContentChange"
                />
              </div>
            </div>

            <div class="detail-variables">
              <h4>变量说明</h4>
              <div class="variables-list">
                <el-tag
                  v-for="variable in extractVariables(selectedPrompt.content)"
                  :key="variable"
                  class="variable-tag"
                  type="warning"
                >
                  {{ variable }}
                </el-tag>
                <span
                  v-if="extractVariables(selectedPrompt.content).length === 0"
                  class="no-variables"
                >
                  当前 prompt 中没有使用变量
                </span>
              </div>
            </div>

            <div class="detail-history">
              <h4>使用历史</h4>
              <el-timeline>
                <el-timeline-item
                  v-for="(history, index) in useHistory.slice(0, 5)"
                  :key="index"
                  :timestamp="formatDate(history.timestamp)"
                >
                  {{ history.context }}
                </el-timeline-item>
              </el-timeline>
            </div>
          </div>

          <div
            v-else
            class="prompt-empty"
          >
            <el-empty description="选择一个 prompt 查看详情" />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleExport">
            导出配置
          </el-button>
          <el-button @click="handleImport">
            导入配置
          </el-button>
          <el-button @click="handleResetToDefault">
            重置为默认模板
          </el-button>
          <el-button
            type="primary"
            @click="dialogVisible = false"
          >
            关闭
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      :title="isEditMode ? '编辑 Prompt' : '新建 Prompt'"
      width="60%"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item
          label="名称"
          prop="name"
        >
          <el-input
            v-model="formData.name"
            placeholder="输入 prompt 名称"
          />
        </el-form-item>

        <el-form-item
          label="分类"
          prop="category"
        >
          <el-select
            v-model="formData.category"
            placeholder="选择或输入分类"
            filterable
            allow-create
          >
            <el-option
              v-for="category in categories"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          label="内容"
          prop="content"
        >
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="12"
            placeholder="输入 prompt 内容，可以使用 {{user_input}} 作为替换符..."
          />
        </el-form-item>

        <el-form-item label="变量提示">
          <div class="variables-hint">
            <p>可用的变量：</p>
            <el-tag
              v-for="variable in availableVariables"
              :key="variable.name"
              class="variable-hint-tag"
              @click="insertVariable(variable.name)"
            >
              {{ variable.name }} - {{ variable.description }}
            </el-tag>
          </div>
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="输入 prompt 描述（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleSave"
        >
          保存
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
import {
  ref, computed, onMounted, watch
} from 'vue'
import {
  Search, Plus, Edit, Delete, Position, Share, Star, Rank
} from '@element-plus/icons-vue'
import {
  ElMessage, ElMessageBox, type FormInstance, type FormRules
} from 'element-plus'

interface Prompt {
  id: string
  name: string
  content: string
  category: string
  description?: string
  isFavorite: boolean
  useCount: number
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
  order: number
}

interface UseHistory {
  timestamp: string
  context: string
}

interface Variable {
  name: string
  description: string
}

const props = defineProps<{
  modelValue: boolean
  userInput?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'apply-prompt': [prompt: Prompt, userInput?: string]
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const searchKeyword = ref('')
const selectedCategory = ref('all')
const selectedPromptId = ref<string | null>(null)
const prompts = ref<Prompt[]>([])
const useHistory = ref<UseHistory[]>([])
const editDialogVisible = ref(false)
const isEditMode = ref(false)
const formRef = ref<FormInstance>()
const fileInputRef = ref<HTMLInputElement>()

const formData = ref({
  id: '',
  name: '',
  content: '',
  category: '',
  description: ''
})

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入 prompt 名称', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入 prompt 内容', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择或输入分类', trigger: 'change' }
  ]
}

const availableVariables: Variable[] = [
  { name: '{{user_input}}', description: '用户输入内容' },
  { name: '{{current_date}}', description: '当前日期' },
  { name: '{{current_time}}', description: '当前时间' },
  { name: '{{conversation_history}}', description: '对话历史' }
]

const defaultPrompts: Prompt[] = [
  {
    id: 'default-1',
    name: '代码审查',
    category: '编程',
    content: '请帮我审查以下代码，并提供改进建议：\n\n{{user_input}}',
    description: '代码审查模板',
    isFavorite: false,
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0
  },
  {
    id: 'default-2',
    name: '文章总结',
    category: '写作',
    content: '请帮我总结以下文章的主要内容：\n\n{{user_input}}',
    description: '文章总结模板',
    isFavorite: false,
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 1
  },
  {
    id: 'default-3',
    name: '翻译助手',
    category: '工具',
    content: '请将以下内容翻译成中文：\n\n{{user_input}}',
    description: '翻译助手模板',
    isFavorite: false,
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 2
  }
]

const categories = computed(() => {
  const categorySet = new Set(prompts.value.map((p) => p.category))
  return Array.from(categorySet).sort()
})

const filteredPrompts = computed(() => {
  let result = [...prompts.value]

  if (selectedCategory.value !== 'all') {
    if (selectedCategory.value === 'favorite') {
      result = result.filter((p) => p.isFavorite)
    } else {
      result = result.filter((p) => p.category === selectedCategory.value)
    }
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(
      (p) => p.name.toLowerCase().includes(keyword)
        || p.content.toLowerCase().includes(keyword)
        || p.description?.toLowerCase().includes(keyword)
    )
  }

  return result.sort((a, b) => a.order - b.order)
})

const selectedPrompt = computed(() => {
  if (!selectedPromptId.value) return null
  return prompts.value.find((p) => p.id === selectedPromptId.value) || null
})

const extractVariables = (content: string): string[] => {
  const regex = /\{\{([^}]+)\}\}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(content)) !== null) {
    variables.push(`{{${match[1]}}}`)
  }

  return [...new Set(variables)]
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return '从未使用'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const loadPrompts = (): void => {
  try {
    const stored = localStorage.getItem('prompts')
    if (stored) {
      prompts.value = JSON.parse(stored)
    } else {
      prompts.value = [...defaultPrompts]
      savePrompts()
    }
  } catch (error) {
    console.error('加载 prompts 失败:', error)
    prompts.value = [...defaultPrompts]
  }
}

const savePrompts = (): void => {
  try {
    localStorage.setItem('prompts', JSON.stringify(prompts.value))
  } catch (error) {
    console.error('保存 prompts 失败:', error)
    ElMessage.error('保存失败')
  }
}

const handleCreate = (): void => {
  isEditMode.value = false
  formData.value = {
    id: '',
    name: '',
    content: '',
    category: categories.value[0] || '默认',
    description: ''
  }
  editDialogVisible.value = true
}

const handleEdit = (prompt: Prompt): void => {
  isEditMode.value = true
  formData.value = {
    id: prompt.id,
    name: prompt.name,
    content: prompt.content,
    category: prompt.category,
    description: prompt.description || ''
  }
  editDialogVisible.value = true
}

const handleSave = async(): Promise<void> => {
  if (!formRef.value) return

  await formRef.value.validate((valid) => {
    if (valid) {
      if (isEditMode.value) {
        const index = prompts.value.findIndex((p) => p.id === formData.value.id)
        if (index !== -1) {
          prompts.value[index] = {
            ...prompts.value[index],
            name: formData.value.name,
            content: formData.value.content,
            category: formData.value.category,
            description: formData.value.description,
            updatedAt: new Date().toISOString()
          }
        }
      } else {
        const newPrompt: Prompt = {
          id: `prompt-${Date.now()}`,
          name: formData.value.name,
          content: formData.value.content,
          category: formData.value.category,
          description: formData.value.description,
          isFavorite: false,
          useCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: prompts.value.length
        }
        prompts.value.push(newPrompt)
      }

      savePrompts()
      editDialogVisible.value = false
      ElMessage.success('保存成功')
    }
  })
}

const handleDelete = async(prompt: Prompt): void => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 prompt "${prompt.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const index = prompts.value.findIndex((p) => p.id === prompt.id)
    if (index !== -1) {
      prompts.value.splice(index, 1)
      savePrompts()

      if (selectedPromptId.value === prompt.id) {
        selectedPromptId.value = null
      }

      ElMessage.success('删除成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const handleSelectPrompt = (prompt: Prompt): void => {
  selectedPromptId.value = prompt.id
}

const handleApplyPrompt = (prompt: Prompt): void => {
  let { content } = prompt

  if (props.userInput) {
    content = content.replace(/\{\{user_input\}\}/g, props.userInput)
  }

  prompt.useCount += 1
  prompt.lastUsedAt = new Date().toISOString()
  savePrompts()

  useHistory.value.unshift({
    timestamp: new Date().toISOString(),
    context: `使用了 "${prompt.name}"`
  })

  emit('apply-prompt', prompt, props.userInput)
  ElMessage.success('Prompt 已应用到输入框')
}

const handleContentChange = (): void => {
  if (selectedPrompt.value) {
    selectedPrompt.value.updatedAt = new Date().toISOString()
    savePrompts()
  }
}

const toggleFavorite = (prompt: Prompt): void => {
  prompt.isFavorite = !prompt.isFavorite
  savePrompts()
}

const insertVariable = (variableName: string): void => {
  const textarea = document.querySelector('.el-textarea__inner') as HTMLTextAreaElement
  if (textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = formData.value.content
    const before = text.substring(0, start)
    const after = text.substring(end)
    formData.value.content = `${before}${variableName}${after}`
    textarea.focus()
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + variableName.length
    }, 0)
  }
}

const handleExport = (): void => {
  try {
    const data = JSON.stringify(prompts.value, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompts-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

const handleImport = (): void => {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

const handleFileImport = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedPrompts = JSON.parse(e.target?.result as string) as Prompt[]

        if (Array.isArray(importedPrompts)) {
          ElMessageBox.confirm(
            `确定要导入 ${importedPrompts.length} 个 prompts 吗？这将覆盖现有的 prompts。`,
            '确认导入',
            {
              confirmButtonText: '确定',
              cancelButtonText: '取消',
              type: 'warning'
            }
          ).then(() => {
            prompts.value = importedPrompts
            savePrompts()
            ElMessage.success('导入成功')
          }).catch(() => {
            ElMessage.info('已取消导入')
          })
        } else {
          ElMessage.error('导入文件格式错误')
        }
      } catch (error) {
        console.error('导入失败:', error)
        ElMessage.error('导入失败，文件格式错误')
      }
    }
    reader.readAsText(file)
  }

  if (target) {
    target.value = ''
  }
}

const handleResetToDefault = async(): Promise<void> => {
  try {
    await ElMessageBox.confirm(
      '确定要重置为默认模板吗？这将删除所有自定义的 prompts。',
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    prompts.value = [...defaultPrompts]
    savePrompts()
    selectedPromptId.value = null
    ElMessage.success('重置成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置失败:', error)
      ElMessage.error('重置失败')
    }
  }
}

const handleShare = (prompt: Prompt): void => {
  const shareData = {
    name: prompt.name,
    content: prompt.content,
    category: prompt.category,
    description: prompt.description
  }

  const shareText = JSON.stringify(shareData, null, 2)

  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareText).then(() => {
      ElMessage.success('Prompt 已复制到剪贴板')
    }).catch(() => {
      ElMessage.error('复制失败')
    })
  } else {
    const textarea = document.createElement('textarea')
    textarea.value = shareText
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('Prompt 已复制到剪贴板')
  }
}

let draggedPrompt: Prompt | null = null

const handleDragStart = (event: DragEvent, prompt: Prompt): void => {
  draggedPrompt = prompt
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragOver = (event: DragEvent): void => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = (event: DragEvent, targetPrompt: Prompt): void => {
  event.preventDefault()

  if (draggedPrompt && draggedPrompt.id !== targetPrompt.id) {
    const draggedIndex = prompts.value.findIndex((p) => p.id === draggedPrompt!.id)
    const targetIndex = prompts.value.findIndex((p) => p.id === targetPrompt.id)

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [removed] = prompts.value.splice(draggedIndex, 1)
      prompts.value.splice(targetIndex, 0, removed)

      prompts.value.forEach((p, index) => {
        p.order = index
      })

      savePrompts()
    }
  }

  draggedPrompt = null
}

onMounted(() => {
  loadPrompts()
})

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    loadPrompts()
  }
})
</script>

<style scoped lang="css">
.prompt-manager :deep(.prompt-manager-dialog) .el-dialog__body {
  padding: 0;
}

.prompt-manager-content {
  display: flex;
  height: 600px;
  border-top: 1px solid var(--el-border-color);
}

.prompt-sidebar {
  width: 320px;
  border-right: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
  background-color: var(--el-fill-color-light);
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.search-input {
  margin-bottom: 12px;
}

.category-filter {
  padding: 8px 16px;
  border-bottom: 1px solid var(--el-border-color);
  overflow-x: auto;
}

.category-filter :deep(.el-radio-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.category-filter :deep(.el-radio-button) {
  margin: 2px;
}

.prompt-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.prompt-item {
  padding: 12px;
  margin-bottom: 8px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.prompt-item:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.prompt-item.active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.prompt-item-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.drag-handle {
  margin-right: 8px;
  cursor: move;
  color: var(--el-text-color-secondary);
}

.prompt-name {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favorite-icon {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition: color 0.3s;
}

.favorite-icon.active {
  color: var(--el-color-warning);
}

.favorite-icon:hover {
  color: var(--el-color-warning);
}

.prompt-item-preview {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-item-footer {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.prompt-main {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.prompt-detail .detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.prompt-detail .detail-header h3 {
  margin: 0;
  font-size: 20px;
}

.prompt-detail .detail-header .detail-actions {
  display: flex;
  gap: 8px;
}

.prompt-detail .detail-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.prompt-detail .detail-content {
  margin-bottom: 20px;
}

.prompt-detail .detail-content h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.prompt-detail .detail-content .content-editor :deep(.el-textarea__inner) {
  font-family: 'Courier New', monospace;
  line-height: 1.6;
}

.prompt-detail .detail-variables {
  margin-bottom: 20px;
}

.prompt-detail .detail-variables h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.prompt-detail .detail-variables .variables-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 32px;
}

.prompt-detail .detail-variables .variables-list .no-variables {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.prompt-detail .detail-history h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.prompt-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.variables-hint p {
  margin: 0 0 8px 0;
  color: var(--el-text-color-secondary);
}

.variables-hint .variable-hint-tag {
  margin: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.variables-hint .variable-hint-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 768px) {
  .prompt-manager-content {
    flex-direction: column;
    height: 500px;
  }

  .prompt-sidebar {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--el-border-color);
  }

  .prompt-main {
    height: 300px;
  }
}
</style>
