function getItem<T>(key: string, defaultValue?: T): T | undefined {
  try {
    const value = localStorage.getItem(key)
    if (value === null) return defaultValue
    return JSON.parse(value) as T
  } catch (error) {
    console.error(`Failed to get storage item "${key}":`, error)
    return defaultValue
  }
}

function setItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to set storage item "${key}":`, error)
  }
}

function removeItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to remove storage item "${key}":`, error)
  }
}

export const storage = { get: getItem, set: setItem, remove: removeItem }
