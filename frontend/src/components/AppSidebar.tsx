import React, { useState } from 'react'
import { Layout, Menu, Button } from 'antd'
import {
  DashboardOutlined,
  TranslationOutlined,
  FileTextOutlined,
  BookOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  HistoryOutlined,
  UserOutlined,
  EditOutlined,
  FileAddOutlined,
  LayoutOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const { Sider } = Layout

const AppSidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
      onClick: () => navigate('/dashboard')
    },
    {
      key: 'document-creation',
      icon: <EditOutlined />,
      label: '英文手册生成',
      children: [
        {
          key: '/document-editor',
          icon: <FileAddOutlined />,
          label: '手册生成器',
          onClick: () => navigate('/document-editor')
        },
        {
          key: '/template-manager',
          icon: <LayoutOutlined />,
          label: '模板管理',
          onClick: () => navigate('/template-manager')
        }
      ]
    },
    {
      key: '/translate',
      icon: <TranslationOutlined />,
      label: '翻译工作台',
      onClick: () => navigate('/translate')
    },
    {
      key: '/documents',
      icon: <FileTextOutlined />,
      label: '文档管理',
      onClick: () => navigate('/documents')
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: '项目管理',
      onClick: () => navigate('/projects')
    },
    {
      key: '/terminology',
      icon: <BookOutlined />,
      label: '术语管理',
      onClick: () => navigate('/terminology')
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: '翻译历史',
      onClick: () => navigate('/history')
    },
    {
      type: 'divider' as const
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/profile')
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      onClick: () => navigate('/settings')
    }
  ]

  return (
    <Sider 
      trigger={null} 
      collapsible 
      collapsed={collapsed}
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0'
      }}
    >
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'flex-end'
      }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{
            fontSize: '16px',
            width: 32,
            height: 32,
          }}
        />
      </div>
      
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{ 
          borderRight: 0,
          height: 'calc(100vh - 64px - 65px)',
          overflowY: 'auto'
        }}
      />
    </Sider>
  )
}

export default AppSidebar
