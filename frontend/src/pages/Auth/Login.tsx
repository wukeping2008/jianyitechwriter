import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, Checkbox, Alert, Space } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../store'
import { loginUser, registerUser } from '../../store/slices/authSlice'
import './styles.css'

const { Title, Text } = Typography

interface LoginFormData {
  email: string
  password: string
  rememberMe?: boolean
}

interface RegisterFormData {
  username: string
  email: string
  password: string
  confirmPassword: string
  fullName: string
}

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { error } = useSelector((state: RootState) => state.auth)

  const [loginForm] = Form.useForm()
  const [registerForm] = Form.useForm()

  const handleLogin = async (values: LoginFormData) => {
    setLoading(true)
    try {
      const result = await dispatch(loginUser(values) as any)
      if (result.type === 'auth/login/fulfilled') {
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('登录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (values: RegisterFormData) => {
    setLoading(true)
    try {
      const result = await dispatch(registerUser(values) as any)
      if (result.type === 'auth/register/fulfilled') {
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('注册失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    loginForm.resetFields()
    registerForm.resetFields()
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-overlay" />
      </div>
      
      <div className="login-content">
        <Card className="login-card" bordered={false}>
          <div className="login-header">
            <div className="logo">
              <img src="/logo.png" alt="简仪科技" className="logo-image" />
            </div>
            <Title level={2} className="login-title">
              {isLogin ? '登录' : '注册'} 简仪科技产品文档制作与翻译系统
            </Title>
            <Text type="secondary" className="login-subtitle">
              {isLogin 
                ? '专业的产品文档制作、翻译和生成平台' 
                : '创建您的账户，开始使用文档制作和翻译服务'
              }
            </Text>
          </div>

          {error && (
            <Alert
              message="操作失败"
              description={error}
              type="error"
              showIcon
              closable
              className="login-error"
            />
          )}

          {isLogin ? (
            <Form
              form={loginForm}
              name="login"
              onFinish={handleLogin}
              autoComplete="off"
              size="large"
              className="login-form"
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="邮箱地址"
                  autoComplete="email"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码长度至少6个字符' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  autoComplete="current-password"
                />
              </Form.Item>

              <Form.Item>
                <div className="login-options">
                  <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                    <Checkbox>记住我</Checkbox>
                  </Form.Item>
                  <Link to="/forgot-password" className="forgot-password">
                    忘记密码？
                  </Link>
                </div>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  className="login-button"
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <Form
              form={registerForm}
              name="register"
              onFinish={handleRegister}
              autoComplete="off"
              size="large"
              className="login-form"
            >
              <Form.Item
                name="fullName"
                rules={[
                  { required: true, message: '请输入姓名' },
                  { min: 2, message: '姓名长度至少2个字符' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="姓名"
                  autoComplete="name"
                />
              </Form.Item>

              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名长度至少3个字符' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="用户名"
                  autoComplete="username"
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="邮箱地址"
                  autoComplete="email"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码长度至少6个字符' },
                  { 
                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
                    message: '密码必须包含至少一个小写字母、一个大写字母和一个数字' 
                  }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'))
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="确认密码"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  className="login-button"
                >
                  注册
                </Button>
              </Form.Item>
            </Form>
          )}

          <div className="login-footer">
            <Space>
              <Text type="secondary">
                {isLogin ? '还没有账户？' : '已有账户？'}
              </Text>
              <Button type="link" onClick={switchMode} className="switch-mode">
                {isLogin ? '立即注册' : '立即登录'}
              </Button>
            </Space>
          </div>

          <div className="login-info">
            <Text type="secondary" className="company-info">
              © 2025 上海简仪科技有限公司. 保留所有权利.
            </Text>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Login
