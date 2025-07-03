import axios from 'axios'

const API_BASE_URL = (window as any).REACT_APP_API_URL || 'http://localhost:5000/api'

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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

export interface SystemStatus {
  isInitialized: boolean
  services: {
    [key: string]: {
      status: 'running' | 'stopped' | 'error'
      health: 'healthy' | 'unhealthy' | 'unknown'
      lastCheck?: number
      error?: string
    }
  }
  performance: {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
    uptime: number
  }
}

export interface PerformanceMetrics {
  totalRequests: number
  averageResponseTime: number
  errorRate: number
  uptime: number
  requestsByService: Record<string, number>
  errorsByService: Record<string, number>
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  uptime: number
  services: Record<string, any>
  performance: {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
  }
  system: {
    nodeVersion: string
    platform: string
    memory: {
      used: number
      total: number
    }
    cpu: {
      usage: any
    }
  }
}

export interface WorkflowStep {
  id: string
  name: string
  description: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  estimatedTime: string
  requiredParams: string[]
}

export interface WorkflowDetail {
  id: string
  name: string
  description: string
  version: string
  author: string
  category: string
  tags: string[]
  configuration: Record<string, any>
  inputSchema: Record<string, any>
  outputSchema: Record<string, any>
}

export interface WorkflowResult {
  workflowId: string
  type: string
  result: any
  completedAt: string
}

export interface SystemConfiguration {
  system: {
    name: string
    version: string
    environment: string
    timezone: string
    locale: string
  }
  features: {
    batchProcessing: {
      enabled: boolean
      maxFiles: number
      maxConcurrency: number
      supportedFormats: string[]
    }
    qualityControl: {
      enabled: boolean
      autoCheck: boolean
      scoreThreshold: number
      dimensions: string[]
    }
    templateManagement: {
      enabled: boolean
      maxTemplates: number
      versionControl: boolean
      collaboration: boolean
    }
    advancedEditor: {
      enabled: boolean
      realTimePreview: boolean
      versionHistory: boolean
      collaborativeEditing: boolean
    }
  }
  limits: {
    maxFileSize: string
    maxBatchSize: number
    maxConcurrentUsers: number
    rateLimit: {
      requests: number
      window: string
    }
  }
  integrations: {
    ai: {
      provider: string
      models: string[]
      fallback: string
    }
    storage: {
      provider: string
      backup: boolean
      retention: string
    }
  }
}

export const systemApi = {
  /**
   * 获取系统状态
   */
  async getSystemStatus(): Promise<{
    success: boolean
    data: SystemStatus
  }> {
    return api.get('/system/status')
  },

  /**
   * 获取系统性能指标
   */
  async getPerformanceMetrics(): Promise<{
    success: boolean
    data: PerformanceMetrics
  }> {
    return api.get('/system/metrics')
  },

  /**
   * 获取系统健康检查
   */
  async getHealthCheck(): Promise<{
    success: boolean
    data: HealthStatus
  }> {
    // 健康检查不需要认证
    const response = await axios.get(`${API_BASE_URL}/system/health`)
    return response.data
  },

  /**
   * 获取系统配置
   */
  async getSystemConfiguration(): Promise<{
    success: boolean
    data: SystemConfiguration
  }> {
    return api.get('/system/configuration')
  },

  /**
   * 初始化系统
   */
  async initializeSystem(): Promise<{
    success: boolean
    message: string
  }> {
    return api.post('/system/initialize')
  },

  /**
   * 记录性能指标
   */
  async recordMetrics(serviceName: string, responseTime: number, isError: boolean = false): Promise<{
    success: boolean
    message: string
  }> {
    return api.post('/system/metrics', {
      serviceName,
      responseTime,
      isError
    })
  },

  /**
   * 获取工作流列表
   */
  async getWorkflows(): Promise<{
    success: boolean
    data: {
      workflows: Workflow[]
      count: number
    }
  }> {
    return api.get('/system/workflows')
  },

  /**
   * 获取工作流详情
   */
  async getWorkflowById(workflowId: string): Promise<{
    success: boolean
    data: WorkflowDetail
  }> {
    return api.get(`/system/workflows/${workflowId}`)
  },

  /**
   * 执行文档生成工作流
   */
  async executeDocumentGenerationWorkflow(
    templateId: string,
    variables: Record<string, any>,
    options: any = {}
  ): Promise<{
    success: boolean
    message: string
    data: WorkflowResult
  }> {
    return api.post('/system/workflows/document-generation', {
      templateId,
      variables,
      options
    })
  },

  /**
   * 执行批量翻译工作流
   */
  async executeBatchTranslationWorkflow(
    files: any[],
    options: any = {}
  ): Promise<{
    success: boolean
    message: string
    data: WorkflowResult
  }> {
    return api.post('/system/workflows/batch-translation', {
      files,
      options
    })
  },

  /**
   * 执行质量保证工作流
   */
  async executeQualityAssuranceWorkflow(
    documentId: string,
    originalText: string,
    translatedText: string,
    options: any = {}
  ): Promise<{
    success: boolean
    message: string
    data: WorkflowResult
  }> {
    return api.post('/system/workflows/quality-assurance', {
      documentId,
      originalText,
      translatedText,
      options
    })
  },

  /**
   * 获取系统统计信息
   */
  async getSystemStatistics(): Promise<{
    success: boolean
    data: {
      overview: {
        totalUsers: number
        totalDocuments: number
        totalTranslations: number
        totalTemplates: number
      }
      performance: PerformanceMetrics
      services: SystemStatus['services']
      recentActivity: Array<{
        type: string
        description: string
        timestamp: string
        user?: string
      }>
    }
  }> {
    const [status, metrics] = await Promise.all([
      this.getSystemStatus(),
      this.getPerformanceMetrics()
    ])

    return {
      success: true,
      data: {
        overview: {
          totalUsers: 0, // 这些数据需要从其他API获取
          totalDocuments: 0,
          totalTranslations: 0,
          totalTemplates: 0
        },
        performance: metrics.data,
        services: status.data.services,
        recentActivity: [] // 这些数据需要从其他API获取
      }
    }
  },

  /**
   * 监控系统状态变化
   */
  createStatusMonitor(onStatusChange: (status: SystemStatus) => void, interval: number = 30000): () => void {
    const monitor = setInterval(async () => {
      try {
        const response = await this.getSystemStatus()
        onStatusChange(response.data)
      } catch (error) {
        console.error('获取系统状态失败:', error)
      }
    }, interval)

    return () => clearInterval(monitor)
  },

  /**
   * 监控性能指标变化
   */
  createPerformanceMonitor(onMetricsChange: (metrics: PerformanceMetrics) => void, interval: number = 60000): () => void {
    const monitor = setInterval(async () => {
      try {
        const response = await this.getPerformanceMetrics()
        onMetricsChange(response.data)
      } catch (error) {
        console.error('获取性能指标失败:', error)
      }
    }, interval)

    return () => clearInterval(monitor)
  },

  /**
   * 检查服务健康状态
   */
  async checkServiceHealth(serviceName: string): Promise<boolean> {
    try {
      const response = await this.getSystemStatus()
      const service = response.data.services[serviceName]
      return service && service.health === 'healthy'
    } catch (error) {
      return false
    }
  },

  /**
   * 获取系统版本信息
   */
  async getVersionInfo(): Promise<{
    version: string
    buildDate: string
    gitCommit: string
    environment: string
  }> {
    try {
      const response = await this.getSystemConfiguration()
      return {
        version: response.data.system.version,
        buildDate: new Date().toISOString(), // 实际应该从构建信息获取
        gitCommit: 'unknown', // 实际应该从构建信息获取
        environment: response.data.system.environment
      }
    } catch (error) {
      return {
        version: 'unknown',
        buildDate: 'unknown',
        gitCommit: 'unknown',
        environment: 'unknown'
      }
    }
  },

  /**
   * 获取系统资源使用情况
   */
  async getResourceUsage(): Promise<{
    cpu: number
    memory: {
      used: number
      total: number
      percentage: number
    }
    disk: {
      used: number
      total: number
      percentage: number
    }
    network: {
      bytesIn: number
      bytesOut: number
    }
  }> {
    try {
      const response = await this.getHealthCheck()
      const memory = response.data.system.memory
      
      return {
        cpu: 0, // 需要从系统API获取
        memory: {
          used: memory.used,
          total: memory.total,
          percentage: Math.round((memory.used / memory.total) * 100)
        },
        disk: {
          used: 0, // 需要从系统API获取
          total: 0,
          percentage: 0
        },
        network: {
          bytesIn: 0, // 需要从系统API获取
          bytesOut: 0
        }
      }
    } catch (error) {
      return {
        cpu: 0,
        memory: { used: 0, total: 0, percentage: 0 },
        disk: { used: 0, total: 0, percentage: 0 },
        network: { bytesIn: 0, bytesOut: 0 }
      }
    }
  }
}

export default systemApi
