import axios from 'axios'

const API_BASE_URL = (window as any).REACT_APP_API_URL || 'http://localhost:5000/api'

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5分钟超时，批量处理可能需要较长时间
})

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token过期，清除本地存储并跳转到登录页
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error.message)
  }
)

export interface BatchTaskResponse {
  success: boolean
  message?: string
  data: {
    taskId: string
    status: string
    fileCount: number
    progress: {
      total: number
      completed: number
      failed: number
      percentage: number
    }
    createdAt: string
  }
}

export interface BatchTaskListResponse {
  success: boolean
  data: {
    tasks: Array<{
      id: string
      status: string
      progress: {
        total: number
        completed: number
        failed: number
        percentage: number
      }
      fileCount: number
      createdAt: string
      completedAt?: string
      processingTime?: number
      retryCount: number
    }>
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

export interface BatchTaskStatusResponse {
  success: boolean
  data: {
    id: string
    status: string
    progress: {
      total: number
      completed: number
      failed: number
      percentage: number
    }
    createdAt: string
    startedAt?: string
    completedAt?: string
    processingTime?: number
    fileCount: number
    options: {
      targetLanguage: string
      outputFormat: string
      includeOriginal: boolean
      generateEnglishManual: boolean
    }
    retryCount: number
    error?: string
  }
}

export interface BatchTaskResultsResponse {
  success: boolean
  data: {
    taskId: string
    status: string
    results: Array<{
      fileIndex: number
      fileName: string
      status: 'completed' | 'failed'
      originalDocument?: any
      translation?: any
      englishManual?: any
      error?: string
      processingTime: number
    }>
    summary: {
      total: number
      completed: number
      failed: number
      successRate: number
    }
  }
}

export interface BatchStatsResponse {
  success: boolean
  data: {
    totalTasks: number
    completedTasks: number
    failedTasks: number
    totalProcessingTime: number
    averageProcessingTime: number
    queueLength: number
    activeTasks: number
    workerPool: {
      available: number
      busy: number
    }
  }
}

export const batchApi = {
  /**
   * 创建批量处理任务
   */
  async createBatchTask(formData: FormData): Promise<BatchTaskResponse> {
    return api.post('/batch/tasks', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<BatchTaskStatusResponse> {
    return api.get(`/batch/tasks/${taskId}`)
  },

  /**
   * 获取任务结果
   */
  async getTaskResults(taskId: string): Promise<BatchTaskResultsResponse> {
    return api.get(`/batch/tasks/${taskId}/results`)
  },

  /**
   * 获取所有任务列表
   */
  async getAllTasks(params?: {
    page?: number
    limit?: number
    status?: string
  }): Promise<BatchTaskListResponse> {
    return api.get('/batch/tasks', { params })
  },

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<{ success: boolean; message: string }> {
    return api.delete(`/batch/tasks/${taskId}`)
  },

  /**
   * 重试失败任务
   */
  async retryTask(taskId: string): Promise<{
    success: boolean
    message: string
    data: {
      taskId: string
      status: string
      retryCount: number
    }
  }> {
    return api.post(`/batch/tasks/${taskId}/retry`)
  },

  /**
   * 导出任务结果
   */
  async exportTaskResults(taskId: string, format: string = 'json'): Promise<any> {
    const response = await api.get(`/batch/tasks/${taskId}/export`, {
      params: { format },
      responseType: format === 'zip' ? 'blob' : 'json'
    })
    return response
  },

  /**
   * 获取系统统计信息
   */
  async getStats(): Promise<BatchStatsResponse> {
    return api.get('/batch/stats')
  },

  /**
   * 清理完成的任务
   */
  async cleanupTasks(hours: number = 24): Promise<{
    success: boolean
    message: string
    data: {
      cleanedCount: number
      hours: number
    }
  }> {
    return api.post('/batch/cleanup', { hours })
  },

  /**
   * 实时监听任务进度（WebSocket）
   */
  createWebSocketConnection(onMessage: (data: any) => void): WebSocket | null {
    try {
      const wsUrl = (window as any).REACT_APP_WS_URL || 'ws://localhost:5000'
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('批量处理WebSocket连接已建立')
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage(data)
        } catch (error) {
          console.error('解析WebSocket消息失败:', error)
        }
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket连接错误:', error)
      }
      
      ws.onclose = () => {
        console.log('批量处理WebSocket连接已关闭')
      }
      
      return ws
    } catch (error) {
      console.error('创建WebSocket连接失败:', error)
      return null
    }
  }
}

export default batchApi
