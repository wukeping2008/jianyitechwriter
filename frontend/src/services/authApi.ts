import axios, { AxiosResponse } from 'axios'
import { LoginCredentials, RegisterCredentials, UpdateProfileData, ChangePasswordData } from '../store/slices/authSlice'

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
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

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // 如果是401错误且不是刷新token的请求
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken
          })

          const { token, refreshToken: newRefreshToken } = response.data.data
          
          localStorage.setItem('token', token)
          localStorage.setItem('refreshToken', newRefreshToken)
          
          // 重新设置请求头
          originalRequest.headers.Authorization = `Bearer ${token}`
          
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        // 刷新失败，清除本地存储并跳转到登录页
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// API响应类型
interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
}

// 认证API类
export class AuthAPI {
  // 设置认证token
  setAuthToken(token: string | null) {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete apiClient.defaults.headers.common['Authorization']
    }
  }

  // 用户登录
  async login(credentials: LoginCredentials): Promise<AxiosResponse<ApiResponse<{
    user: any
    token: string
    refreshToken: string
    expiresIn: number
  }>>> {
    return apiClient.post('/auth/login', credentials)
  }

  // 用户注册
  async register(credentials: RegisterCredentials): Promise<AxiosResponse<ApiResponse<{
    user: any
    token: string
    refreshToken: string
  }>>> {
    return apiClient.post('/auth/register', credentials)
  }

  // 获取当前用户信息
  async getCurrentUser(): Promise<AxiosResponse<ApiResponse<{
    user: any
  }>>> {
    return apiClient.get('/auth/me')
  }

  // 更新用户资料
  async updateProfile(data: UpdateProfileData): Promise<AxiosResponse<ApiResponse<{
    user: any
  }>>> {
    return apiClient.put('/auth/profile', data)
  }

  // 修改密码
  async changePassword(data: ChangePasswordData): Promise<AxiosResponse<ApiResponse>> {
    return apiClient.put('/auth/change-password', data)
  }

  // 忘记密码
  async forgotPassword(email: string): Promise<AxiosResponse<ApiResponse<{
    message: string
  }>>> {
    return apiClient.post('/auth/forgot-password', { email })
  }

  // 重置密码
  async resetPassword(token: string, newPassword: string): Promise<AxiosResponse<ApiResponse<{
    message: string
  }>>> {
    return apiClient.post('/auth/reset-password', { token, newPassword })
  }

  // 刷新token
  async refreshToken(refreshToken: string): Promise<AxiosResponse<ApiResponse<{
    token: string
    refreshToken: string
  }>>> {
    return apiClient.post('/auth/refresh-token', { refreshToken })
  }

  // 用户登出
  async logout(): Promise<AxiosResponse<ApiResponse>> {
    return apiClient.post('/auth/logout')
  }

  // 验证邮箱
  async verifyEmail(token: string): Promise<AxiosResponse<ApiResponse<{
    message: string
  }>>> {
    return apiClient.get(`/auth/verify-email/${token}`)
  }
}

// 创建API实例
export const authAPI = new AuthAPI()

// 导出axios实例供其他服务使用
export { apiClient }
export default authAPI
