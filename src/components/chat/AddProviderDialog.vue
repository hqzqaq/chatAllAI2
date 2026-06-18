<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="80px"
    >
      <el-form-item
        label="名称"
        prop="name"
      >
        <el-input
          v-model="formData.name"
          placeholder="请输入模型名称"
        />
      </el-form-item>

      <el-form-item
        label="URL"
        prop="url"
      >
        <el-input
          v-model="formData.url"
          placeholder="https://example.com"
        />
      </el-form-item>

      <el-form-item label="图标">
        <div class="icon-preview-wrapper">
          <div
            v-if="formData.icon"
            class="icon-preview"
          >
            <img
              :src="formData.icon"
              alt="图标预览"
            >
          </div>
          <div
            v-else
            class="icon-preview icon-preview-empty"
          >
            <el-icon><Picture /></el-icon>
          </div>
          <div class="icon-upload-actions">
            <el-button
              type="primary"
              plain
              size="small"
              @click="handleSelectIcon"
            >
              选择图标文件
            </el-button>
            <el-button
              v-if="formData.icon"
              type="danger"
              plain
              size="small"
              @click="handleClearIcon"
            >
              清除
            </el-button>
            <span
              v-if="iconFileName"
              class="icon-file-name"
            >{{ iconFileName }}</span>
            <span
              v-else
              class="icon-placeholder"
            >支持 PNG、JPG、ICO、SVG 格式</span>
          </div>
        </div>
        <input
          ref="iconInputRef"
          type="file"
          accept=".png,.jpg,.jpeg,.ico,.svg"
          style="display: none"
          @change="handleIconFileChange"
        >
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">
        取消
      </el-button>
      <el-button
        type="primary"
        @click="handleConfirm"
      >
        {{ confirmButtonText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  ref, reactive, computed, watch
} from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import { useChatStore } from '../../stores'

const chatStore = useChatStore()

const visible = defineModel<boolean>('modelValue', { default: false })

const props = defineProps<{
  editProvider?: { id: string; name: string; url: string; icon?: string } | null
}>()

const emit = defineEmits<{(e: 'added', providerId: string): void
  (e: 'updated', providerId: string): void
}>()

const formRef = ref<FormInstance>()
const iconInputRef = ref<HTMLInputElement>()

const formData = reactive({
  name: '',
  url: '',
  icon: ''
})

const iconFileName = ref<string>('')

const isEditMode = computed(() => !!props.editProvider)

const dialogTitle = computed(() => (isEditMode.value ? '编辑模型' : '添加模型'))

const confirmButtonText = computed(() => (isEditMode.value ? '确认修改' : '确认添加'))

const handleSelectIcon = (): void => {
  if (iconInputRef.value) {
    iconInputRef.value.click()
  }
}

const handleIconFileChange = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  iconFileName.value = file.name

  const reader = new FileReader()
  reader.onload = (e) => {
    formData.icon = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // 重置 input 以便可以重复选择同一文件
  target.value = ''
}

const handleClearIcon = (): void => {
  formData.icon = ''
  iconFileName.value = ''
}

const validateUrl = (_rule: any, value: string, callback: (error?: Error) => void): void => {
  if (!value) {
    callback(new Error('请输入URL'))
    return
  }
  try {
    const url = new URL(value)
    if (!url.protocol.startsWith('http')) {
      callback(new Error('URL必须以 http:// 或 https:// 开头'))
      return
    }
    callback()
  } catch {
    callback(new Error('请输入有效的URL'))
  }
}

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入模型名称', trigger: 'blur' },
    {
      min: 1, max: 50, message: '名称长度在1到50个字符之间', trigger: 'blur'
    }
  ],
  url: [
    { required: true, validator: validateUrl, trigger: 'blur' }
  ]
}

const resetForm = (): void => {
  formData.name = ''
  formData.url = ''
  formData.icon = ''
  iconFileName.value = ''
}

/**
 * 监听编辑对象变化，初始化表单数据
 */
watch(
  () => props.editProvider,
  (provider) => {
    if (provider) {
      formData.name = provider.name
      formData.url = provider.url
      formData.icon = provider.icon || ''
      iconFileName.value = provider.icon ? '已设置图标' : ''
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

const handleClose = (): void => {
  visible.value = false
  resetForm()
}

const handleConfirm = async(): Promise<void> => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    if (isEditMode.value && props.editProvider) {
      // 编辑模式
      const success = chatStore.updateCustomProvider(props.editProvider.id, {
        name: formData.name,
        url: formData.url,
        icon: formData.icon || undefined
      })

      if (success) {
        ElMessage.success(`已更新模型: ${formData.name}`)
        emit('updated', props.editProvider.id)
        handleClose()
      } else {
        ElMessage.error('更新模型失败')
      }
    } else {
      // 添加模式
      const provider = chatStore.addCustomProvider({
        name: formData.name,
        url: formData.url,
        icon: formData.icon || undefined
      })

      if (provider) {
        ElMessage.success(`已添加模型: ${provider.name}`)
        emit('added', provider.id)
        handleClose()
      } else {
        ElMessage.error('添加模型失败')
      }
    }
  } catch {
    // 表单校验失败，不执行操作
  }
}
</script>
