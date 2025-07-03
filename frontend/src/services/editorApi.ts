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

export interface EditorSession {
  sessionId: string
  documentId: string
  userId: string
  options: {
    enableTerminologyHighlight: boolean
    enableRealTimeSync: boolean
    enableVersionControl: boolean
    language: string
  }
  content: {
    original: string
    translated: string
    currentVersion: number
  }
  collaborators: string[]
  createdAt: string
  lastActivity: string
  isActive: boolean
}

export interface SessionCreateResponse {
  success: boolean
  message: string
  data: {
    sessionId: string
    documentId: string
    options: any
    createdAt: string
  }
}

export interface ContentUpdateResponse {
  success: boolean
  message: string
  data: {
    changeId: string
    contentType: string
    timestamp: string
    metadata: {
      length: number
      wordCount: number
    }
  }
}

export interface TerminologyHighlightResponse {
  success: boolean
  message: string
  data: {
    highlightedText: string
    terms: Array<{
      term: string
      translation: string
      category: string
      position: number
      length: number
      color: string
      confidence: number
    }>
    statistics: {
      totalTerms: number
      categories: string[]
    }
  }
}

export interface ComparisonResponse {
  success: boolean
  message: string
  data: {
    sessionId: string
    timestamp: string
    segments: Array<{
      index: number
      original: string
      translated: string
      status: 'matched' | 'modified' | 'added' | 'deleted'
      similarity: number
      suggestions?: string[]
    }>
    statistics: {
      totalSegments: number
      matchedSegments: number
      modifiedSegments: number
      addedSegments: number
      deletedSegments: number
    }
  }
}

export interface VersionHistoryResponse {
  success: boolean
  data: {
    sessionId: string
    contentType: string
    versions: Array<{
      version: number
      timestamp: string
      userId: string
      metadata: {
        length: number
        wordCount: number
      }
    }>
  }
}

export interface SessionStatsResponse {
  success: boolean
  data: {
    totalSessions: number
    totalCollaborators: number
    sessionsByLanguage: Record<string, any[]>
    averageSessionDuration: number
    lastActivity: number | null
  }
}

export interface UserSessionsResponse {
  success: boolean
  data: {
    sessions: Array<{
      sessionId: string
      documentId: string
      role: 'owner' | 'collaborator'
      createdAt: string
      lastActivity: string
      collaborators: string[]
      isActive: boolean
    }>
    total: number
  }
}

export const editorApi = {
  /**
   * 创建编辑会话
   */
  async createSession(documentId: string, options: any = {}): Promise<SessionCreateResponse> {
    return api.post('/editor/sessions', {
      documentId,
      options
    })
  },

  /**
   * 获取编辑会话信息
   */
  async getSession(sessionId: string): Promise<{ success: boolean; data: EditorSession }> {
    return api.get(`/editor/sessions/${sessionId}`)
  },

  /**
   * 更新文档内容
   */
  async updateContent(
    sessionId: string, 
    content: string, 
    type: 'original' | 'translated' = 'original'
  ): Promise<ContentUpdateResponse> {
    return api.put(`/editor/sessions/${sessionId}/content`, {
      content,
      type
    })
  },

  /**
   * 术语高亮处理
   */
  async highlightTerminology(
    sessionId: string, 
    text: string, 
    terminologyData: any
  ): Promise<TerminologyHighlightResponse> {
    return api.post(`/editor/sessions/${sessionId}/highlight`, {
      text,
      terminologyData
    })
  },

  /**
   * 翻译对比
   */
  async compareTranslations(
    sessionId: string, 
    originalText: string, 
    translatedText: string, 
    options: any = {}
  ): Promise<ComparisonResponse> {
    return api.post(`/editor/sessions/${sessionId}/compare`, {
      originalText,
      translatedText,
      options
    })
  },

  /**
   * 获取版本历史
   */
  async getVersionHistory(
    sessionId: string, 
    contentType: 'original' | 'translated' = 'original'
  ): Promise<VersionHistoryResponse> {
    return api.get(`/editor/sessions/${sessionId}/versions`, {
      params: { contentType }
    })
  },

  /**
   * 恢复版本
   */
  async restoreVersion(
    sessionId: string, 
    contentType: 'original' | 'translated', 
    versionNumber: number
  ): Promise<{
    success: boolean
    message: string
    data: {
      version: number
      contentType: string
      timestamp: string
    }
  }> {
    return api.post(`/editor/sessions/${sessionId}/restore`, {
      contentType,
      versionNumber
    })
  },

  /**
   * 添加协作者
   */
  async addCollaborator(
    sessionId: string, 
    userId: string
  ): Promise<{
    success: boolean
    message: string
    data: {
      sessionId: string
      collaborators: string[]
    }
  }> {
    return api.post(`/editor/sessions/${sessionId}/collaborators`, {
      userId
    })
  },

  /**
   * 移除协作者
   */
  async removeCollaborator(
    sessionId: string, 
    userId: string
  ): Promise<{
    success: boolean
    message: string
    data: {
      sessionId: string
      collaborators: string[]
    }
  }> {
    return api.delete(`/editor/sessions/${sessionId}/collaborators/${userId}`)
  },

  /**
   * 关闭编辑会话
   */
  async closeSession(sessionId: string): Promise<{
    success: boolean
    message: string
  }> {
    return api.delete(`/editor/sessions/${sessionId}`)
  },

  /**
   * 获取活跃会话统计
   */
  async getSessionStats(): Promise<SessionStatsResponse> {
    return api.get('/editor/stats')
  },

  /**
   * 获取用户的编辑会话列表
   */
  async getUserSessions(status: 'active' | 'all' = 'active'): Promise<UserSessionsResponse> {
    return api.get('/editor/my-sessions', {
      params: { status }
    })
  },

  /**
   * 创建WebSocket连接用于实时协作
   */
  createWebSocketConnection(onMessage: (data: any) => void): WebSocket | null {
    try {
      const wsUrl = (window as any).REACT_APP_WS_URL || 'ws://localhost:5000'
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('高级编辑器WebSocket连接已建立')
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
        console.log('高级编辑器WebSocket连接已关闭')
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
   * 加入编辑会话房间
   */
  joinSession(ws: WebSocket, sessionId: string) {
    this.sendWebSocketMessage(ws, 'joinSession', sessionId)
  },

  /**
   * 离开编辑会话房间
   */
  leaveSession(ws: WebSocket, sessionId: string) {
    this.sendWebSocketMessage(ws, 'leaveSession', sessionId)
  },

  /**
   * 发送内容变化
   */
  sendContentChange(ws: WebSocket, sessionId: string, content: string, type: string) {
    this.sendWebSocketMessage(ws, 'contentChange', {
      sessionId,
      content,
      type,
      timestamp: new Date().toISOString()
    })
  },

  /**
   * 发送光标位置
   */
  sendCursorMove(ws: WebSocket, sessionId: string, position: number, selection: any) {
    this.sendWebSocketMessage(ws, 'cursorMove', {
      sessionId,
      position,
      selection,
      timestamp: new Date().toISOString()
    })
  }
}

export default editorApi
