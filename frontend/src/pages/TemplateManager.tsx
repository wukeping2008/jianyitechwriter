import React, { useState } from 'react'
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Input, 
  Select, 
  Card, 
  Modal,
  Form,
  message,
  Tooltip,
  Dropdown,
  Popconfirm,
  Row,
  Col,
  Upload,
  Image
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileTextOutlined,
  LayoutOutlined,
  MoreOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Search } = Input
const { Option } = Select
const { TextArea } = Input

interface Template {
  id: string
  name: string
  category: string
  description: string
  thumbnail: string
  content: string
  createdAt: string
  updatedAt: string
  usageCount: number
  isPublic: boolean
  author: string
}

const TemplateManager: React.FC = () => {
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [modalVisible, setModalVisible] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [form] = Form.useForm()

  // 模拟模板数据
  const templates: Template[] = [
    {
      id: '1',
      name: 'PXI产品手册模板',
      category: 'PXI硬件',
      description: '标准的PXI模块产品手册模板，包含产品概述、技术规格、安装指南等章节',
      thumbnail: '/templates/pxi-manual-thumb.png',
      content: '<h1>PXI产品手册</h1><h2>产品概述</h2><p>...</p>',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-15',
      usageCount: 45,
      isPublic: true,
      author: '系统管理员'
    },
    {
      id: '2',
      name: '数据采集系统说明书模板',
      category: '数据采集',
      description: '数据采集设备的标准说明书模板，适用于DAQ卡、采集模块等产品',
      thumbnail: '/templates/daq-manual-thumb.png',
      content: '<h1>数据采集系统说明书</h1><h2>系统架构</h2><p>...</p>',
      createdAt: '2024-01-12',
      updatedAt: '2024-01-18',
      usageCount: 32,
      isPublic: true,
      author: '技术文档组'
    },
    {
      id: '3',
      name: '测试设备操作指南模板',
      category: '测试测量',
      description: '测试测量设备的操作指南模板，包含设备连接、软件配置、测试流程等',
      thumbnail: '/templates/test-guide-thumb.png',
      content: '<h1>测试设备操作指南</h1><h2>设备连接</h2><p>...</p>',
      createdAt: '2024-01-08',
      updatedAt: '2024-01-20',
      usageCount: 28,
      isPublic: false,
      author: '张工程师'
    },
    {
      id: '4',
      name: '软件用户手册模板',
      category: '软件文档',
      description: '软件产品的用户手册模板，包含安装、配置、功能介绍等内容',
      thumbnail: '/templates/software-manual-thumb.png',
      content: '<h1>软件用户手册</h1><h2>安装指南</h2><p>...</p>',
      createdAt: '2024-01-05',
      updatedAt: '2024-01-22',
      usageCount: 67,
      isPublic: true,
      author: '软件开发组'
    },
    {
      id: '5',
      name: '技术规格书模板',
      category: '技术文档',
      description: '产品技术规格书模板，详细描述产品的技术参数和性能指标',
      thumbnail: '/templates/spec-sheet-thumb.png',
      content: '<h1>技术规格书</h1><h2>产品参数</h2><table>...</table>',
      createdAt: '2024-01-03',
      updatedAt: '2024-01-25',
      usageCount: 89,
      isPublic: true,
      author: '产品经理'
    }
  ]

  const categories = ['PXI硬件', '数据采集', '测试测量', '软件文档', '技术文档']

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    form.setFieldsValue(template)
    setModalVisible(true)
  }

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template)
    setPreviewVisible(true)
  }

  const handleDelete = (id: string) => {
    message.success('模板删除成功')
  }

  const handleCopy = (template: Template) => {
    const newTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} - 副本`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      usageCount: 0
    }
    message.success('模板复制成功')
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingTemplate) {
        message.success('模板更新成功')
      } else {
        message.success('模板创建成功')
      }
      setModalVisible(false)
      setEditingTemplate(null)
      form.resetFields()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const getActionMenu = (record: Template) => ({
    items: [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => handleEdit(record)
      },
      {
        key: 'copy',
        icon: <CopyOutlined />,
        label: '复制',
        onClick: () => handleCopy(record)
      },
      {
        key: 'download',
        icon: <DownloadOutlined />,
        label: '导出'
      },
      {
        type: 'divider' as const
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => handleDelete(record.id)
      }
    ]
  })

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Template) => (
        <Space>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.description}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="blue">{category}</Tag>
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      sorter: (a: Template, b: Template) => a.usageCount - b.usageCount,
      render: (count: number) => (
        <Space>
          <Text>{count}</Text>
          <Text type="secondary">次</Text>
        </Space>
      )
    },
    {
      title: '可见性',
      dataIndex: 'isPublic',
      key: 'isPublic',
      render: (isPublic: boolean) => (
        <Tag color={isPublic ? 'green' : 'orange'}>
          {isPublic ? '公开' : '私有'}
        </Tag>
      )
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author'
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      sorter: (a: Template, b: Template) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Template) => (
        <Space>
          <Tooltip title="预览">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              size="small"
              onClick={() => handleCopy(record)}
            />
          </Tooltip>
          <Dropdown menu={getActionMenu(record)} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </Space>
      )
    }
  ]

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchText.toLowerCase()) ||
      template.description.includes(searchText)
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>模板管理</Title>
        <Text type="secondary">
          管理文档模板，提高文档制作效率
        </Text>
      </div>

      {/* 操作栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Search
              placeholder="搜索模板名称或描述"
              allowClear
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
            />
            
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: 150 }}
              placeholder="分类筛选"
            >
              <Option value="all">全部分类</Option>
              {categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Space>

          <Space>
            <Upload>
              <Button icon={<UploadOutlined />}>导入模板</Button>
            </Upload>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingTemplate(null)
                form.resetFields()
                setModalVisible(true)
              }}
            >
              新建模板
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 模板表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredTemplates}
          rowKey="id"
          pagination={{
            total: filteredTemplates.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
      </Card>

      {/* 新建/编辑模板模态框 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '新建模板'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingTemplate(null)
          form.resetFields()
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="模板名称"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="请输入模板名称" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类">
                  {categories.map(category => (
                    <Option key={category} value={category}>{category}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="模板描述"
            rules={[{ required: true, message: '请输入模板描述' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="请输入模板的用途和特点"
            />
          </Form.Item>

          <Form.Item
            name="content"
            label="模板内容"
            rules={[{ required: true, message: '请输入模板内容' }]}
          >
            <TextArea 
              rows={10} 
              placeholder="请输入模板的HTML内容"
            />
          </Form.Item>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="isPublic"
                label="可见性"
                initialValue={true}
              >
                <Select>
                  <Option value={true}>公开 - 所有用户可见</Option>
                  <Option value={false}>私有 - 仅自己可见</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="thumbnail"
                label="缩略图"
              >
                <Upload>
                  <Button icon={<UploadOutlined />}>上传缩略图</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false)
                setEditingTemplate(null)
                form.resetFields()
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingTemplate ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 模板预览模态框 */}
      <Modal
        title={`预览模板：${previewTemplate?.name}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="use" type="primary" icon={<LayoutOutlined />}>
            使用此模板
          </Button>,
          <Button key="download" icon={<DownloadOutlined />}>
            下载模板
          </Button>
        ]}
        width="80%"
        style={{ top: 20 }}
      >
        {previewTemplate && (
          <div>
            <div style={{ marginBottom: '16px', padding: '16px', background: '#f5f5f5', borderRadius: '6px' }}>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text strong>分类：</Text>
                  <Tag color="blue">{previewTemplate.category}</Tag>
                </Col>
                <Col span={12}>
                  <Text strong>作者：</Text>
                  <Text>{previewTemplate.author}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>使用次数：</Text>
                  <Text>{previewTemplate.usageCount} 次</Text>
                </Col>
                <Col span={12}>
                  <Text strong>更新时间：</Text>
                  <Text>{previewTemplate.updatedAt}</Text>
                </Col>
                <Col span={24}>
                  <Text strong>描述：</Text>
                  <br />
                  <Text>{previewTemplate.description}</Text>
                </Col>
              </Row>
            </div>
            
            <div 
              style={{ 
                maxHeight: '60vh', 
                overflow: 'auto',
                padding: '20px',
                background: '#fff',
                border: '1px solid #e8e8e8',
                borderRadius: '6px'
              }}
              dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default TemplateManager
