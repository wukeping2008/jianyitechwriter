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
  Popconfirm
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  BookOutlined,
  ExportOutlined,
  ImportOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Search } = Input
const { Option } = Select
const { TextArea } = Input

interface Term {
  id: string
  english: string
  chinese: string
  category: string
  context: string
  frequency: number
  confidence: number
  createdAt: string
  updatedAt: string
}

const TerminologyManager: React.FC = () => {
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingTerm, setEditingTerm] = useState<Term | null>(null)
  const [form] = Form.useForm()

  // 模拟术语数据
  const terms: Term[] = [
    {
      id: '1',
      english: 'PXI Module',
      chinese: 'PXI模块',
      category: 'PXI硬件',
      context: 'PXI (PCI eXtensions for Instrumentation) 标准的模块化仪器',
      frequency: 156,
      confidence: 98,
      createdAt: '2024-01-10',
      updatedAt: '2024-01-15'
    },
    {
      id: '2',
      english: 'Data Acquisition',
      chinese: '数据采集',
      category: '数据采集',
      context: '从传感器或其他信号源收集数据的过程',
      frequency: 234,
      confidence: 95,
      createdAt: '2024-01-10',
      updatedAt: '2024-01-12'
    },
    {
      id: '3',
      english: 'Analog Input',
      chinese: '模拟输入',
      category: '信号处理',
      context: '连续变化的电压或电流信号输入',
      frequency: 189,
      confidence: 97,
      createdAt: '2024-01-10',
      updatedAt: '2024-01-14'
    },
    {
      id: '4',
      english: 'Sampling Rate',
      chinese: '采样率',
      category: '信号处理',
      context: '每秒钟采集数据样本的次数，通常以Hz或S/s表示',
      frequency: 145,
      confidence: 96,
      createdAt: '2024-01-11',
      updatedAt: '2024-01-13'
    },
    {
      id: '5',
      english: 'VISA',
      chinese: 'VISA',
      category: '软件接口',
      context: 'Virtual Instrument Software Architecture，虚拟仪器软件架构',
      frequency: 78,
      confidence: 99,
      createdAt: '2024-01-11',
      updatedAt: '2024-01-11'
    }
  ]

  const categories = ['PXI硬件', '数据采集', '信号处理', '软件接口', '测试测量']

  const getConfidenceTag = (confidence: number) => {
    if (confidence >= 95) return <Tag color="green">高</Tag>
    if (confidence >= 85) return <Tag color="orange">中</Tag>
    return <Tag color="red">低</Tag>
  }

  const getActionMenu = (record: Term) => ({
    items: [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => handleEdit(record)
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

  const handleEdit = (term: Term) => {
    setEditingTerm(term)
    form.setFieldsValue(term)
    setModalVisible(true)
  }

  const handleDelete = (id: string) => {
    message.success('术语删除成功')
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingTerm) {
        message.success('术语更新成功')
      } else {
        message.success('术语添加成功')
      }
      setModalVisible(false)
      setEditingTerm(null)
      form.resetFields()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const columns = [
    {
      title: '英文术语',
      dataIndex: 'english',
      key: 'english',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '中文翻译',
      dataIndex: 'chinese',
      key: 'chinese',
      render: (text: string) => <Text>{text}</Text>
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="blue">{category}</Tag>
    },
    {
      title: '使用频率',
      dataIndex: 'frequency',
      key: 'frequency',
      sorter: (a: Term, b: Term) => a.frequency - b.frequency,
      render: (frequency: number) => (
        <Space>
          <Text>{frequency}</Text>
          <Text type="secondary">次</Text>
        </Space>
      )
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      sorter: (a: Term, b: Term) => a.confidence - b.confidence,
      render: (confidence: number) => (
        <Space>
          {getConfidenceTag(confidence)}
          <Text type="secondary">{confidence}%</Text>
        </Space>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      sorter: (a: Term, b: Term) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Term) => (
        <Space>
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个术语吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                size="small"
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const filteredTerms = terms.filter(term => {
    const matchesSearch = 
      term.english.toLowerCase().includes(searchText.toLowerCase()) ||
      term.chinese.includes(searchText)
    const matchesCategory = categoryFilter === 'all' || term.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>术语管理</Title>
        <Text type="secondary">
          管理专业术语库，确保翻译的一致性和准确性
        </Text>
      </div>

      {/* 操作栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Search
              placeholder="搜索英文或中文术语"
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
            <Button icon={<ImportOutlined />}>导入术语</Button>
            <Button icon={<ExportOutlined />}>导出术语</Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingTerm(null)
                form.resetFields()
                setModalVisible(true)
              }}
            >
              添加术语
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 术语表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredTerms}
          rowKey="id"
          pagination={{
            total: filteredTerms.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          expandable={{
            expandedRowRender: (record: Term) => (
              <div style={{ padding: '16px', background: '#fafafa' }}>
                <Text strong>上下文说明：</Text>
                <br />
                <Text>{record.context}</Text>
              </div>
            ),
            rowExpandable: (record: Term) => !!record.context
          }}
        />
      </Card>

      {/* 添加/编辑术语模态框 */}
      <Modal
        title={editingTerm ? '编辑术语' : '添加术语'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingTerm(null)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="english"
            label="英文术语"
            rules={[{ required: true, message: '请输入英文术语' }]}
          >
            <Input placeholder="请输入英文术语" />
          </Form.Item>

          <Form.Item
            name="chinese"
            label="中文翻译"
            rules={[{ required: true, message: '请输入中文翻译' }]}
          >
            <Input placeholder="请输入中文翻译" />
          </Form.Item>

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

          <Form.Item
            name="context"
            label="上下文说明"
          >
            <TextArea 
              rows={3} 
              placeholder="请输入术语的使用场景和说明"
            />
          </Form.Item>

          <Form.Item
            name="confidence"
            label="置信度"
            initialValue={95}
          >
            <Select>
              <Option value={99}>99% - 非常高</Option>
              <Option value={95}>95% - 高</Option>
              <Option value={90}>90% - 中等</Option>
              <Option value={85}>85% - 较低</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false)
                setEditingTerm(null)
                form.resetFields()
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingTerm ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TerminologyManager
