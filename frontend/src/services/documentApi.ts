import axios from 'axios'

const API_BASE_URL = (window as any).REACT_APP_API_URL || 'http://localhost:5000/api'

// 创建axios实例
const documentApi = axios.create({
  baseURL: `${API_BASE_URL}/documents`,
  timeout: 300000, // 5分钟超时，因为文档生成可能需要较长时间
})

// 请求拦截器 - 添加认证token
documentApi.interceptors.request.use(
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
documentApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期，清除本地存储并跳转到登录页
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 类型定义
export interface ParsedData {
  type: string
  text: string
  technicalSpecs: Record<string, string>
  sections: Array<{
    title: string
    content: string
  }>
  metadata: {
    filename: string
    fileType: string
    fileSize: number
    parsedAt: string
  }
}

export interface GeneratedDocument {
  metadata: {
    title: string
    productType: string
    template: string
    language: string
    generatedAt: string
    version: string
  }
  productInfo: {
    productName: string
    productFamily: string
    category: string
    description: string
    keyFeatures: string[]
    applications: string[]
    targetMarket: string
    technicalSpecs: Record<string, string>
  }
  sections: Array<{
    id: string
    title: string
    content: string
    required: boolean
  }>
  sourceData: {
    filename: string
    fileType: string
    parsedAt: string
  }
  html: string
}

export interface DocumentTemplate {
  id: string
  name: string
  sections: Array<{
    id: string
    title: string
    required: boolean
  }>
}

export interface GenerationOptions {
  productType?: string
  language?: string
  detailLevel?: string
  includeSections?: Array<{ id: string }>
}

// API方法
export const documentApiService = {
  /**
   * 获取支持的文件格式
   */
  async getSupportedFormats() {
    const response = await documentApi.get('/formats')
    return response.data
  },

  /**
   * 获取可用的文档模板
   */
  async getTemplates(): Promise<{ data: { templates: DocumentTemplate[] } }> {
    const response = await documentApi.get('/templates')
    return response.data
  },

  /**
   * 获取文档生成统计信息
   */
  async getStats() {
    const response = await documentApi.get('/stats')
    return response.data
  },

  /**
   * 上传并解析文档
   */
  async uploadAndParse(file: File): Promise<{ data: { parsedData: ParsedData } }> {
    const formData = new FormData()
    formData.append('document', file)

    const response = await documentApi.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log(`Upload progress: ${percentCompleted}%`)
        }
      },
    })

    return response.data
  },

  /**
   * 批量上传并解析文档
   */
  async uploadAndParseMultiple(files: File[]) {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('documents', file)
    })

    const response = await documentApi.post('/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data
  },

  /**
   * 根据解析数据生成产品手册
   */
  async generateManual(
    parsedData: ParsedData, 
    options: GenerationOptions = {}
  ): Promise<{ data: { document: GeneratedDocument } }> {
    const response = await documentApi.post('/generate', {
      parsedData,
      options: {
        language: 'en', // 默认生成英文手册
        ...options
      }
    })

    return response.data
  },

  /**
   * 完整的文档生成流程（上传 + 解析 + 生成）
   */
  async generateFromUpload(
    file: File, 
    options: GenerationOptions = {}
  ): Promise<{ data: { document: GeneratedDocument, parsedData: ParsedData } }> {
    const formData = new FormData()
    formData.append('document', file)
    formData.append('options', JSON.stringify({
      language: 'en', // 默认生成英文手册
      ...options
    }))

    const response = await documentApi.post('/generate-from-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log(`Upload progress: ${percentCompleted}%`)
        }
      },
    })

    return response.data
  },

  /**
   * 识别产品类型
   */
  async identifyProductType(parsedData: ParsedData): Promise<{ data: { productType: string, confidence: number } }> {
    const response = await documentApi.post('/identify-type', { parsedData })
    return response.data
  },

  /**
   * 预览生成的文档
   */
  async previewDocument(document: GeneratedDocument): Promise<string> {
    const response = await documentApi.post('/preview', { document }, {
      responseType: 'text'
    })
    return response.data
  },

  /**
   * 导出文档
   */
  async exportDocument(document: GeneratedDocument, format: 'html' | 'json' = 'html'): Promise<Blob> {
    const response = await documentApi.post('/export', { document, format }, {
      responseType: 'blob'
    })
    return response.data
  },

  /**
   * 下载文档文件
   */
  downloadDocument(document: GeneratedDocument, format: 'html' | 'json' = 'html') {
    const filename = `${document.productInfo.productName.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`
    
    if (format === 'html') {
      const blob = new Blob([document.html], { type: 'text/html;charset=utf-8' })
      this.downloadBlob(blob, filename)
    } else if (format === 'json') {
      const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json;charset=utf-8' })
      this.downloadBlob(blob, filename)
    }
  },

  /**
   * 下载Blob文件的辅助方法
   */
  downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export default documentApiService
