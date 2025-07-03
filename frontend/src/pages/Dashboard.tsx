import React, { useEffect } from 'react'
import { Row, Col, Card, Statistic, Progress, List, Typography, Space, Button, Avatar } from 'antd'
import {
  FileTextOutlined,
  TranslationOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TrophyOutlined,
  RiseOutlined,
  SettingOutlined,
  EditOutlined,
  LayoutOutlined
} from '@ant-design/icons'
import { useAppSelector, useAppDispatch } from '../store'

const { Title, Text } = Typography

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)

  // 模拟数据 - 实际项目中应该从API获取
  const stats = {
    totalDocuments: 156,
    translatedDocuments: 142,
    inProgressDocuments: 8,
    pendingDocuments: 6,
    wordsTranslated: 45230,
    projectsCompleted: 23,
    translationAccuracy: 96.5
  }

  const recentActivities = [
    {
      id: 1,
      type: 'translation',
      title: 'PXI-6251数据采集卡用户手册',
      status: 'completed',
      time: '2小时前',
      progress: 100
    },
    {
      id: 2,
      type: 'document',
      title: 'DAQ系统配置指南',
      status: 'in-progress',
      time: '4小时前',
      progress: 75
    },
    {
      id: 3,
      type: 'review',
      title: '测试测量设备规格书',
      status: 'pending',
      time: '1天前',
      progress: 45
    },
    {
      id: 4,
      type: 'translation',
      title: 'LabVIEW驱动程序文档',
      status: 'completed',
      time: '2天前',
      progress: 100
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#52c41a'
      case 'in-progress': return '#1890ff'
      case 'pending': return '#faad14'
      default: return '#d9d9d9'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'in-progress': return '进行中'
      case 'pending': return '待处理'
      default: return '未知'
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          欢迎回来，{user?.fullName || user?.username || '用户'}！
        </Title>
        <Text type="secondary">
          这里是您的文档制作和翻译工作概览，让我们开始今天的工作吧。
        </Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总文档数"
              value={stats.totalDocuments}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已翻译"
              value={stats.translatedDocuments}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="进行中"
              value={stats.inProgressDocuments}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="翻译准确率"
              value={stats.translationAccuracy}
              precision={1}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 工作进度 */}
        <Col xs={24} lg={12}>
          <Card title="本月工作进度" extra={<Button type="link">查看详情</Button>}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>翻译字数</Text>
                  <Text strong>{stats.wordsTranslated.toLocaleString()} / 50,000</Text>
                </div>
                <Progress 
                  percent={(stats.wordsTranslated / 50000) * 100} 
                  strokeColor="#1890ff"
                  showInfo={false}
                />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>完成项目</Text>
                  <Text strong>{stats.projectsCompleted} / 30</Text>
                </div>
                <Progress 
                  percent={(stats.projectsCompleted / 30) * 100} 
                  strokeColor="#52c41a"
                  showInfo={false}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>文档完成率</Text>
                  <Text strong>{((stats.translatedDocuments / stats.totalDocuments) * 100).toFixed(1)}%</Text>
                </div>
                <Progress 
                  percent={(stats.translatedDocuments / stats.totalDocuments) * 100} 
                  strokeColor="#722ed1"
                  showInfo={false}
                />
              </div>
            </Space>
          </Card>
        </Col>

        {/* 最近活动 */}
        <Col xs={24} lg={12}>
          <Card title="最近活动" extra={<Button type="link">查看全部</Button>}>
            <List
              dataSource={recentActivities}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={
                          item.type === 'translation' ? <TranslationOutlined /> :
                          item.type === 'document' ? <FileTextOutlined /> :
                          <UserOutlined />
                        }
                        style={{ 
                          backgroundColor: getStatusColor(item.status),
                          color: '#fff'
                        }}
                      />
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{item.title}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{item.time}</Text>
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <Text type="secondary">{getStatusText(item.status)}</Text>
                          <Text type="secondary">{item.progress}%</Text>
                        </div>
                        <Progress 
                          percent={item.progress} 
                          size="small" 
                          strokeColor={getStatusColor(item.status)}
                          showInfo={false}
                        />
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 快速操作 */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card title="快速操作">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={8}>
                <Button 
                  type="primary" 
                  icon={<EditOutlined />} 
                  size="large" 
                  block
                  onClick={() => window.location.href = '/document-editor'}
                >
                  生成英文手册
                </Button>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Button 
                  icon={<TranslationOutlined />} 
                  size="large" 
                  block
                  onClick={() => window.location.href = '/translate'}
                >
                  开始翻译
                </Button>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Button 
                  icon={<LayoutOutlined />} 
                  size="large" 
                  block
                  onClick={() => window.location.href = '/template-manager'}
                >
                  模板管理
                </Button>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
              <Col xs={24} sm={12} lg={8}>
                <Button 
                  icon={<FileTextOutlined />} 
                  size="large" 
                  block
                  onClick={() => window.location.href = '/documents'}
                >
                  文档管理
                </Button>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Button 
                  icon={<RiseOutlined />} 
                  size="large" 
                  block
                  onClick={() => window.location.href = '/history'}
                >
                  查看报告
                </Button>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Button 
                  icon={<SettingOutlined />} 
                  size="large" 
                  block
                  onClick={() => window.location.href = '/settings'}
                >
                  系统设置
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
