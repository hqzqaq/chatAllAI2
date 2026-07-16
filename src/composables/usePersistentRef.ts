import { ref, watch, type Ref } from 'vue'
import { storage } from '../utils/storage'

interface UsePersistentRefOptions<T> {
  deep?: boolean
  serialize?: (value: T) => unknown
  deserialize?: (stored: unknown) => T
  immediate?: boolean
}

export function usePersistentRef<T>(
  key: string,
  defaultValue: T,
  options: UsePersistentRefOptions<T> = {}
): {
  data: Ref<T>
  save: () => void
  load: () => void
  clear: () => void
} {
  const {
    deep = true, serialize, deserialize, immediate = true
  } = options

  const data = ref<T>(defaultValue) as Ref<T>

  const save = (): void => {
    const value = serialize ? serialize(data.value) : data.value
    storage.set(key, value)
  }

  const load = (): void => {
    const stored = storage.get<unknown>(key)
    if (stored !== undefined && stored !== null) {
      if (deserialize) {
        data.value = deserialize(stored)
      } else if (Array.isArray(defaultValue)) {
        data.value = stored as T
      } else if (typeof defaultValue === 'object' && defaultValue !== null) {
        data.value = { ...defaultValue, ...(stored as T) } as T
      } else {
        data.value = stored as T
      }
    }
  }

  const clear = (): void => {
    storage.remove(key)
    if (Array.isArray(defaultValue)) {
      data.value = JSON.parse(JSON.stringify(defaultValue))
    } else if (typeof defaultValue === 'object' && defaultValue !== null) {
      data.value = JSON.parse(JSON.stringify(defaultValue))
    } else {
      data.value = defaultValue
    }
  }

  if (immediate) {
    load()
  }

  watch(
    data,
    () => {
      save()
    },
    { deep }
  )

  return {
    data,
    save,
    load,
    clear
  }
}
