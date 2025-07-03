import axios from 'axios'

const API_BASE_URL = (window as any).REACT_APP_API_URL || 'http://localhost:5000/api'

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 1分钟超时，质量检查可能需要较长时间
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

export interface QualityCheckResponse {
  success: boolean
  message: string
  data: {
    checkId: string
    documentId: string
    score: number
    status: 'passed' | 'failed' | 'processing'
    timestamp: string
    summary: {
      totalIssues: number
      criticalIssues: number
      highIssues: number
      mediumIssues: number
      lowIssues: number
    }
  }
}

export interface QualityReportResponse {
  success: boolean
  data: {
    id: string
    documentId: string
    timestamp: string
    score: number
    status: 'passed' | 'failed' | 'processing'
    summary: {
      totalIssues: number
      criticalIssues: number
      highIssues: number
      mediumIssues: number
      lowIssues: number
    }
    checks: Record<string, {
      name: string
      score: number
      issueCount: number
    }>
    issues?: Array<{
      type: string
      severity: 'critical' | 'high' | 'medium' | 'low'
      message: string
      sourceText?: string
      expectedTranslation?: string
      category?: string
    }>
    recommendations?: Array<{
      type: string
      priority: 'high' | 'medium' | 'low'
      message: string
      actions: string[]
    }>
    checkDetails?: any
  }
}

export interface QualityStatsResponse {
  success: boolean
  data: {
    totalChecks: number
    passedChecks: number
    failedChecks: number
    passRate: number
    averageScore: number
    commonIssues: Array<{
      type: string
      count: number
    }>
  }
}

export interface QualityRulesResponse {
  success: boolean
  data: {
    rules: {
      terminology: {
        enabled: boolean
        strictMode: boolean
        categories: string[]
      }
      consistency: {
        enabled: boolean
        checkTranslationConsistency: boolean
        checkTerminologyConsistency: boolean
        checkFormatConsistency: boolean
      }
      format: {
        enabled: boolean
        checkPunctuation: boolean
        checkNumberFormat: boolean
        checkCapitalization: boolean
        checkSpacing: boolean
      }
      completeness: {
        enabled: boolean
        checkMissingTranslations: boolean
        checkEmptySegments: boolean
        checkUntranslatedTerms: boolean
      }
      accuracy: {
        enabled: boolean
        aiConfidenceThreshold: number
        humanReviewRequired: boolean
        flagSuspiciousTranslations: boolean
      }
    }
    weights: {
      terminology: number
      consistency: number
      format: number
      completeness: number
      accuracy: number
    }
    description: Record<string, string>
  }
}

export interface BatchQualityCheckResponse {
  success: boolean
  message: string
  data: {
    batchId: string
    totalDocuments: number
    successfulChecks: number
    failedChecks: number
    averageScore: number
    results: Array<{
      documentId: string
      checkId?: string
      score?: number
      status: string
      issueCount?: number
      error?: string
    }>
  }
}

export interface QualityRecommendationsResponse {
  success: boolean
  data: {
    checkId: string
    overallScore: number
    recommendations: Array<{
      type: string
      priority: 'high' | 'medium' | 'low'
      message: string
      actions: string[]
    }>
    improvementPlan: {
      immediate: any[]
      shortTerm: any[]
      longTerm: any[]
    }
    estimatedImpact: {
      immediate: string
      shortTerm: string
      longTerm: string
    }
  }
}

export const qualityApi = {
  /**
   * 执行质量检查
   */
  async performQualityCheck(
    documentId: string,
    originalText: string,
    translatedText: string,
    options: any = {}
  ): Promise<QualityCheckResponse> {
    return api.post('/quality/check', {
      documentId,
      originalText,
      translatedText,
      options
    })
  },

  /**
   * 获取质量检查报告
   */
  async getQualityReport(
    checkId: string,
    includeDetails: boolean = true
  ): Promise<QualityReportResponse> {
    return api.get(`/quality/reports/${checkId}`, {
      params: { includeDetails: includeDetails.toString() }
    })
  },

  /**
   * 获取质量检查统计信息
   */
  async getQualityStats(): Promise<QualityStatsResponse> {
    return api.get('/quality/stats')
  },

  /**
   * 获取质量检查规则配置
   */
  async getQualityRules(): Promise<QualityRulesResponse> {
    return api.get('/quality/rules')
  },

  /**
   * 更新质量检查规则配置
   */
  async updateQualityRules(
    rules?: any,
    weights?: any
  ): Promise<{
    success: boolean
    message: string
    data: {
      rules: any
      weights: any
    }
  }> {
    return api.put('/quality/rules', {
      rules,
      weights
    })
  },

  /**
   * 批量质量检查
   */
  async batchQualityCheck(
    documents: Array<{
      documentId: string
      originalText: string
      translatedText: string
    }>,
    options: any = {}
  ): Promise<BatchQualityCheckResponse> {
    return api.post('/quality/batch-check', {
      documents,
      options
    })
  },

  /**
   * 获取质量改进建议
   */
  async getQualityRecommendations(checkId: string): Promise<QualityRecommendationsResponse> {
    return api.get(`/quality/recommendations/${checkId}`)
  },

  /**
   * 导出质量检查报告
   */
  async exportQualityReport(
    checkId: string,
    format: string = 'json'
  ): Promise<any> {
    const response = await api.get(`/quality/export/${checkId}`, {
      params: { format },
      responseType: format === 'json' ? 'json' : 'blob'
    })
    return response
  },

  /**
   * 创建WebSocket连接用于实时质量检查
   */
  createWebSocketConnection(onMessage: (data: any) => void): WebSocket | null {
    try {
      const wsUrl = (window as any).REACT_APP_WS_URL || 'ws://localhost:5000'
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('质量控制WebSocket连接已建立')
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
        console.log('质量控制WebSocket连接已关闭')
      }
      
      return ws
    } catch (error) {
      console.error('创建WebSocket连接失败:', error)
      return null
    }
  },

  /**
   * 发送WebSocket消息
   */
  sendWebSocketMessage(ws: WebSocket, type: string, data: any) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }))
    }
  },

  /**
   * 加入质量检查房间
   */
  joinQualityCheck(ws: WebSocket, checkId: string) {
    this.sendWebSocketMessage(ws, 'joinQualityCheck', checkId)
  },

  /**
   * 离开质量检查房间
   */
  leaveQualityCheck(ws: WebSocket, checkId: string) {
    this.sendWebSocketMessage(ws, 'leaveQualityCheck', checkId)
  }
}

export default qualityApi
