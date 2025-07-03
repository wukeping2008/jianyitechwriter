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

export interface TemplateType {
  value: string
  label: string
  description: string
}

export interface ProductCategory {
  value: string
  label: string
  description: string
}

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object'
  description: string
  defaultValue?: any
  required: boolean
  validation?: {
    min?: number
    max?: number
    pattern?: string
    options?: string[]
  }
}

export interface TemplateSection {
  id: string
  name: string
  title: string
  order: number
  required: boolean
  type: 'text' | 'table' | 'image' | 'list' | 'code' | 'specifications' | 'features' | 'procedures'
  template: string
  placeholder: string
  validation?: {
    required: boolean
    minLength?: number
    maxLength?: number
    pattern?: string
  }
}

export interface TemplateStructure {
  sections: TemplateSection[]
  variables: TemplateVariable[]
  styling?: {
    fontFamily: string
    fontSize: number
    lineHeight: number
    margins?: {
      top: number
      bottom: number
      left: number
      right: number
    }
    colors?: {
      primary: string
      secondary: string
      text: string
      background: string
    }
  }
}

export interface Template {
  _id: string
  name: string
  description: string
  type: string
  productCategory: string
  structure: TemplateStructure
  generationConfig?: {
    prompts?: {
      systemPrompt: string
      sectionPrompts: Array<{
        sectionId: string
        prompt: string
      }>
    }
    parameters?: {
      temperature: number
      maxTokens: number
      model: string
    }
    postProcessing?: {
      formatTables: boolean
      generateTOC: boolean
      addPageNumbers: boolean
      validateLinks: boolean
    }
  }
  sampleData?: {
    variables: any
    generatedContent: string
    previewImages: string[]
  }
  usage: {
    timesUsed: number
    lastUsed?: string
    averageRating: number
    totalRatings: number
  }
  version: string
  parentTemplate?: string
  childTemplates: string[]
  status: 'draft' | 'active' | 'deprecated' | 'archived'
  isPublic: boolean
  isDefault: boolean
  createdBy: {
    _id: string
    username: string
    fullName: string
  }
  organization: string
  tags: string[]
  category: string
  reviews: Array<{
    user: string
    rating: number
    comment: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

export interface TemplateListResponse {
  success: boolean
  data: {
    templates: Template[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

export interface TemplateResponse {
  success: boolean
  data: Template
}

export interface TemplateCreateResponse {
  success: boolean
  message: string
  data: {
    templateId: string
    name: string
    type: string
    status: string
    version: string
    createdAt: string
  }
}

export interface DocumentGenerationResponse {
  success: boolean
  message: string
  data: {
    content: {
      sections: Array<{
        id: string
        name: string
        title: string
        content: string
        order: number
      }>
      metadata: {
        templateId: string
        templateName: string
        templateVersion: string
        generatedAt: string
        generationTime: number
        variables: any
      }
    }
    metadata: {
      templateId: string
      templateName: string
      templateVersion: string
      generatedAt: string
      generationTime: number
      variables: any
    }
  }
}

export interface TemplateStatisticsResponse {
  success: boolean
  data: {
    totalTemplates: number
    activeTemplates: number
    totalUsage: number
    averageRating: number
    templatesByType: any[]
    popularTemplates: Template[]
    recentTemplates: Template[]
    generationStats: {
      totalGenerations: number
      averageGenerationTime: number
    }
  }
}

export interface ValidationResponse {
  success: boolean
  data: {
    isValid: boolean
    errors: string[]
    templateId: string
  }
}

export interface PreviewResponse {
  success: boolean
  data: {
    templateId: string
    templateName: string
    previewContent: {
      sections: Array<{
        id: string
        name: string
        title: string
        content: string
        order: number
      }>
      metadata: any
    }
    variables: any
  }
}

export const templateApi = {
  /**
   * 获取模板列表
   */
  async getTemplates(params: {
    type?: string
    productCategory?: string
    status?: string
    isPublic?: boolean
    tags?: string[]
    search?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<TemplateListResponse> {
    const queryParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          queryParams.append(key, value.join(','))
        } else {
          queryParams.append(key, value.toString())
        }
      }
    })
    
    return api.get(`/templates?${queryParams.toString()}`)
  },

  /**
   * 获取模板详情
   */
  async getTemplateById(templateId: string, includeUsage: boolean = false): Promise<TemplateResponse> {
    return api.get(`/templates/${templateId}?includeUsage=${includeUsage}`)
  },

  /**
   * 创建新模板
   */
  async createTemplate(templateData: Partial<Template>): Promise<TemplateCreateResponse> {
    return api.post('/templates', templateData)
  },

  /**
   * 更新模板
   */
  async updateTemplate(templateId: string, updateData: Partial<Template>): Promise<{
    success: boolean
    message: string
    data: {
      templateId: string
      name: string
      version: string
      updatedAt: string
    }
  }> {
    return api.put(`/templates/${templateId}`, updateData)
  },

  /**
   * 删除模板
   */
  async deleteTemplate(templateId: string): Promise<{
    success: boolean
    message: string
  }> {
    return api.delete(`/templates/${templateId}`)
  },

  /**
   * 复制模板
   */
  async duplicateTemplate(templateId: string, newName?: string): Promise<TemplateCreateResponse> {
    return api.post(`/templates/${templateId}/duplicate`, { name: newName })
  },

  /**
   * 生成文档
   */
  async generateDocument(
    templateId: string, 
    variables: Record<string, any>, 
    options: any = {}
  ): Promise<DocumentGenerationResponse> {
    return api.post(`/templates/${templateId}/generate`, {
      variables,
      options
    })
  },

  /**
   * 获取推荐模板
   */
  async getRecommendedTemplates(limit: number = 5): Promise<{
    success: boolean
    data: {
      recommendations: Template[]
      count: number
    }
  }> {
    return api.get(`/templates/recommendations?limit=${limit}`)
  },

  /**
   * 获取模板统计信息
   */
  async getTemplateStatistics(): Promise<TemplateStatisticsResponse> {
    return api.get('/templates/statistics')
  },

  /**
   * 获取用户的模板
   */
  async getUserTemplates(params: {
    status?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<TemplateListResponse> {
    const queryParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString())
      }
    })
    
    return api.get(`/templates/my-templates?${queryParams.toString()}`)
  },

  /**
   * 导入模板
   */
  async importTemplate(templateData: any): Promise<TemplateCreateResponse> {
    return api.post('/templates/import', templateData)
  },

  /**
   * 导出模板
   */
  async exportTemplate(templateId: string, format: string = 'json'): Promise<string> {
    const response = await axios.get(`${API_BASE_URL}/templates/${templateId}/export?format=${format}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      responseType: 'text'
    })
    return response.data
  },

  /**
   * 添加模板评价
   */
  async addTemplateReview(templateId: string, rating: number, comment?: string): Promise<{
    success: boolean
    message: string
    data: {
      rating: number
      averageRating: number
      totalRatings: number
    }
  }> {
    return api.post(`/templates/${templateId}/review`, {
      rating,
      comment
    })
  },

  /**
   * 获取模板类型列表
   */
  async getTemplateTypes(): Promise<{
    success: boolean
    data: TemplateType[]
  }> {
    return api.get('/templates/types')
  },

  /**
   * 获取产品类别列表
   */
  async getProductCategories(): Promise<{
    success: boolean
    data: ProductCategory[]
  }> {
    return api.get('/templates/categories')
  },

  /**
   * 初始化默认模板
   */
  async initializeDefaultTemplates(): Promise<{
    success: boolean
    message: string
  }> {
    return api.post('/templates/initialize-defaults')
  },

  /**
   * 验证模板变量
   */
  async validateTemplateVariables(
    templateId: string, 
    variables: Record<string, any>
  ): Promise<ValidationResponse> {
    return api.post(`/templates/${templateId}/validate`, { variables })
  },

  /**
   * 获取模板预览
   */
  async getTemplatePreview(
    templateId: string, 
    variables: Record<string, any> = {}
  ): Promise<PreviewResponse> {
    return api.post(`/templates/${templateId}/preview`, { variables })
  },

  /**
   * 搜索模板
   */
  async searchTemplates(query: string, filters: {
    type?: string
    productCategory?: string
    tags?: string[]
  } = {}): Promise<TemplateListResponse> {
    return this.getTemplates({
      search: query,
      ...filters,
      status: 'active',
      isPublic: true
    })
  },

  /**
   * 获取热门模板
   */
  async getPopularTemplates(limit: number = 10): Promise<TemplateListResponse> {
    return this.getTemplates({
      sortBy: 'usage.timesUsed',
      sortOrder: 'desc',
      status: 'active',
      isPublic: true,
      limit
    })
  },

  /**
   * 获取最新模板
   */
  async getRecentTemplates(limit: number = 10): Promise<TemplateListResponse> {
    return this.getTemplates({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      status: 'active',
      isPublic: true,
      limit
    })
  },

  /**
   * 按类型获取模板
   */
  async getTemplatesByType(type: string, productCategory?: string): Promise<TemplateListResponse> {
    return this.getTemplates({
      type,
      productCategory,
      status: 'active',
      isPublic: true
    })
  },

  /**
   * 按标签获取模板
   */
  async getTemplatesByTags(tags: string[]): Promise<TemplateListResponse> {
    return this.getTemplates({
      tags,
      status: 'active',
      isPublic: true
    })
  }
}

export default templateApi
