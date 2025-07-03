import React from 'react'
import { Layout, Avatar, Dropdown, Space, Typography, Button } from 'antd'
import { UserOutlined, LogoutOutlined, SettingOutlined, BellOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store'
import { logoutUser, clearAuth } from '../store/slices/authSlice'

const { Header } = Layout
const { Text } = Typography

const AppHeader: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)

  const handleLogout = () => {
    dispatch(logoutUser())
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/profile')
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings')
    },
    {
      type: 'divider' as const
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  return (
    <Header style={{
      background: '#fff',
      padding: '0 24px',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img 
          src="/logo.png" 
          alt="简仪科技" 
          style={{ height: 32, marginRight: 16 }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
          简仪科技产品文档制作与翻译系统
        </Text>
      </div>

      <Space size="middle">
        <Button 
          type="text" 
          icon={<BellOutlined />} 
          style={{ color: '#666' }}
        />
        
        <Dropdown 
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Space style={{ cursor: 'pointer' }}>
            <Avatar 
              size="small" 
              icon={<UserOutlined />}
              src={user?.avatar}
            />
            <Text>{user?.fullName || user?.username || '用户'}</Text>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  )
}

export default AppHeader
