import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface Toast {
  id: string
  title: string
  message?: string
  type: ToastType
  duration: number
}

const toasts = ref<Toast[]>([])

export const useToast = () => {
  const add = (options: { title: string; message?: string; type?: ToastType; duration?: number }) => {
    const id = Math.random().toString(36).substring(2, 9)
    const duration = options.duration ?? 3000
    
    toasts.value.push({
      id,
      title: options.title,
      message: options.message,
      type: options.type || 'success',
      duration
    })

    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }

    return id
  }

  const success = (title: string, message?: string, duration?: number) => add({ title, message, type: 'success', duration })
  const error = (title: string, message?: string, duration?: number) => add({ title, message, type: 'error', duration })
  const warning = (title: string, message?: string, duration?: number) => add({ title, message, type: 'warning', duration })
  const info = (title: string, message?: string, duration?: number) => add({ title, message, type: 'info', duration })
  const loading = (title: string, message?: string) => add({ title, message, type: 'loading', duration: 0 })

  const remove = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    toasts,
    add,
    success,
    error,
    warning,
    info,
    loading,
    remove
  }
}
