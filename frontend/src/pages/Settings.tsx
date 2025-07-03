import React, { useState } from 'react'
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Switch, 
  Button, 
  Space, 
  Typography, 
  Divider,
  Row,
  Col,
  message,
  Tabs,
  Slider,
  Radio
} from 'antd'
import {
  UserOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  BellOutlined,
  TranslationOutlined,
  SaveOutlined
} from '@ant-design/icons'
import { useAppSelector } from '../store'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input
const { TabPane } = Tabs

const Settings: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSave = async (values: any) => {
    setLoading(true)
    try {
      // 这里应该调用API保存设置
      await new Promise(resolve => setTimeout(resolve, 1000))
      message.success('设置保存成功')
    } catch (error) {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const ProfileSettings = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSave}
      initialValues={{
        fullName: user?.fullName || '',
        username: user?.username || '',
        email: user?.email || '',
        department: user?.department || '',
        jobTitle: user?.jobTitle || '',
        organization: user?.organization || '简仪科技'
      }}
    >
      <Row gutter={[24, 0]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="fullName"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[24, 0]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="organization"
            label="组织"
          >
            <Input placeholder="请输入组织名称" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[24, 0]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="department"
            label="部门"
          >
            <Input placeholder="请输入部门" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="jobTitle"
            label="职位"
          >
            <Input placeholder="请输入职位" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
          保存个人信息
        </Button>
      </Form.Item>
    </Form>
  )

  const TranslationSettings = () => (
    <Form
      layout="vertical"
      initialValues={{
        defaultSourceLanguage: 'en',
        defaultTargetLanguage: 'zh',
        translationQuality: 'balanced',
        autoSave: true,
        showTerminologyHints: true,
        enableKeyboardShortcuts: true,
        maxFileSize: 50,
        batchSize: 5
      }}
    >
      <Card title="默认翻译设置" size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={[24, 0]}>
          <Col xs={24} md={12}>
            <Form.Item
              name="defaultSourceLanguage"
              label="默认源语言"
            >
              <Select>
                <Option value="en">英文</Option>
                <Option value="zh">中文</Option>
                <Option value="ja">日文</Option>
                <Option value="ko">韩文</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="defaultTargetLanguage"
              label="默认目标语言"
            >
              <Select>
                <Option value="zh">中文</Option>
                <Option value="en">英文</Option>
                <Option value="ja">日文</Option>
                <Option value="ko">韩文</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="translationQuality"
          label="翻译质量模式"
        >
          <Radio.Group>
            <Radio value="fast">快速模式 - 速度优先</Radio>
            <Radio value="balanced">平衡模式 - 速度与质量并重</Radio>
            <Radio value="accurate">精确模式 - 质量优先</Radio>
          </Radio.Group>
        </Form.Item>
      </Card>

      <Card title="工作流设置" size="small" style={{ marginBottom: '16px' }}>
        <Form.Item
          name="autoSave"
          label="自动保存"
          valuePropName="checked"
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>

        <Form.Item
          name="showTerminologyHints"
          label="显示术语提示"
          valuePropName="checked"
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>

        <Form.Item
          name="enableKeyboardShortcuts"
          label="启用键盘快捷键"
          valuePropName="checked"
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>
      </Card>

      <Card title="文件处理设置" size="small">
        <Form.Item
          name="maxFileSize"
          label="最大文件大小 (MB)"
        >
          <Slider
            min={10}
            max={100}
            marks={{
              10: '10MB',
              50: '50MB',
              100: '100MB'
            }}
          />
        </Form.Item>

        <Form.Item
          name="batchSize"
          label="批量处理数量"
        >
          <Slider
            min={1}
            max={10}
            marks={{
              1: '1',
              5: '5',
              10: '10'
            }}
          />
        </Form.Item>
      </Card>

      <Form.Item>
        <Button type="primary" icon={<SaveOutlined />}>
          保存翻译设置
        </Button>
      </Form.Item>
    </Form>
  )

  const NotificationSettings = () => (
    <Form
      layout="vertical"
      initialValues={{
        emailNotifications: true,
        browserNotifications: true,
        translationComplete: true,
        documentGenerated: true,
        systemUpdates: false,
        weeklyReport: true,
        errorAlerts: true
      }}
    >
      <Card title="通知方式" size="small" style={{ marginBottom: '16px' }}>
        <Form.Item
          name="emailNotifications"
          label="邮件通知"
          valuePropName="checked"
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>

        <Form.Item
          name="browserNotifications"
          label="浏览器通知"
          valuePropName="checked"
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>
      </Card>

      <Card title="通知内容" size="small" style={{ marginBottom: '16px' }}>
        <Form.Item
          name="translationComplete"
          label="翻译完成通知"
          valuePropName="checked"
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>

        <Form.Item
          name="documentGenerated"
          label="文档生成通知"
          valuePropName="checked"
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>

        <Form.Item
          name="systemUpdates"
          label="系统更新通知"
          valuePropName="checked"
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>

        <Form.Item
          name="weeklyReport"
          label="周报通知"
          valuePropName="checked"
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>

        <Form.Item
          name="errorAlerts"
          label="错误警报"
          valuePropName="checked"
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>
      </Card>

      <Form.Item>
        <Button type="primary" icon={<SaveOutlined />}>
          保存通知设置
        </Button>
      </Form.Item>
    </Form>
  )

  const SecuritySettings = () => (
    <Form layout="vertical">
      <Card title="密码设置" size="small" style={{ marginBottom: '16px' }}>
        <Form.Item
          name="currentPassword"
          label="当前密码"
          rules={[{ required: true, message: '请输入当前密码' }]}
        >
          <Input.Password placeholder="请输入当前密码" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度至少6个字符' }
          ]}
        >
          <Input.Password placeholder="请输入新密码" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认新密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('两次输入的密码不一致'))
              },
            }),
          ]}
        >
          <Input.Password placeholder="请确认新密码" />
        </Form.Item>

        <Form.Item>
          <Button type="primary">修改密码</Button>
        </Form.Item>
      </Card>

      <Card title="安全选项" size="small">
        <Form.Item
          name="twoFactorAuth"
          label="双因素认证"
          valuePropName="checked"
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>

        <Form.Item
          name="loginAlerts"
          label="登录提醒"
          valuePropName="checked"
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button>查看登录历史</Button>
            <Button danger>注销所有设备</Button>
          </Space>
        </Form.Item>
      </Card>
    </Form>
  )

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>系统设置</Title>
        <Text type="secondary">
          管理您的个人信息、翻译偏好和系统配置
        </Text>
      </div>

      <Card>
        <Tabs defaultActiveKey="profile" type="card">
          <TabPane 
            tab={
              <span>
                <UserOutlined />
                个人信息
              </span>
            } 
            key="profile"
          >
            <ProfileSettings />
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <TranslationOutlined />
                翻译设置
              </span>
            } 
            key="translation"
          >
            <TranslationSettings />
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <BellOutlined />
                通知设置
              </span>
            } 
            key="notifications"
          >
            <NotificationSettings />
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <SecurityScanOutlined />
                安全设置
              </span>
            } 
            key="security"
          >
            <SecuritySettings />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default Settings
