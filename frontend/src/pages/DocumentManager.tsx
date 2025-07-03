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
  Upload, 
  Modal,
  Progress,
  Tooltip,
  Dropdown
} from 'antd'
import {
  UploadOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileExcelOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Search } = Input
const { Option } = Select

interface Document {
  id: string
  name: string
  type: 'word' | 'pdf' | 'excel'
  size: string
  status: 'pending' | 'translating' | 'completed' | 'failed'
  progress: number
  uploadTime: string
  translatedTime?: string
  language: string
  category: string
}

const DocumentManager: React.FC = () => {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [uploadModalVisible, setUploadModalVisible] = useState(false)

  // 模拟文档数据
  const documents: Document[] = [
    {
      id: '1',
      name: 'PXI-6251数据采集卡用户手册.docx',
      type: 'word',
      size: '2.5 MB',
      status: 'completed',
      progress: 100,
      uploadTime: '2024-01-15 10:30',
      translatedTime: '2024-01-15 11:45',
      language: '英文→中文',
      category: 'PXI模块'
    },
    {
      id: '2',
      name: 'DAQ系统配置指南.pdf',
      type: 'pdf',
      size: '1.8 MB',
      status: 'translating',
      progress: 75,
      uploadTime: '2024-01-15 14:20',
      language: '英文→中文',
      category: '数据采集'
    },
    {
      id: '3',
      name: '测试测量设备规格表.xlsx',
      type: 'excel',
      size: '856 KB',
      status: 'pending',
      progress: 0,
      uploadTime: '2024-01-15 16:10',
      language: '英文→中文',
      category: '测试测量'
    },
    {
      id: '4',
      name: 'LabVIEW驱动程序文档.docx',
      type: 'word',
      size: '3.2 MB',
      status: 'completed',
      progress: 100,
      uploadTime: '2024-01-14 09:15',
      translatedTime: '2024-01-14 10:30',
      language: '英文→中文',
      category: '软件驱动'
    },
    {
      id: '5',
      name: 'PXI机箱安装手册.pdf',
      type: 'pdf',
      size: '4.1 MB',
      status: 'failed',
      progress: 0,
      uploadTime: '2024-01-14 15:45',
      language: '英文→中文',
      category: 'PXI模块'
    }
  ]

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'word': return <FileTextOutlined style={{ color: '#1890ff' }} />
      case 'pdf': return <FilePdfOutlined style={{ color: '#f5222d' }} />
      case 'excel': return <FileExcelOutlined style={{ color: '#52c41a' }} />
      default: return <FileTextOutlined />
    }
  }

  const getStatusTag = (status: string) => {
    const statusConfig = {
      pending: { color: 'default', text: '待处理' },
      translating: { color: 'processing', text: '翻译中' },
      completed: { color: 'success', text: '已完成' },
      failed: { color: 'error', text: '失败' }
    }
    const config = statusConfig[status as keyof typeof statusConfig]
    return <Tag color={config.color}>{config.text}</Tag>
  }

  const getActionMenu = (record: Document) => ({
    items: [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: '查看详情'
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑'
      },
      {
        key: 'download',
        icon: <DownloadOutlined />,
        label: '下载'
      },
      {
        type: 'divider' as const
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true
      }
    ]
  })

  const columns = [
    {
      title: '文档名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Document) => (
        <Space>
          {getFileIcon(record.type)}
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap = {
          word: 'Word',
          pdf: 'PDF',
          excel: 'Excel'
        }
        return typeMap[type as keyof typeof typeMap]
      }
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number, record: Document) => (
        <div style={{ width: '100px' }}>
          <Progress 
            percent={progress} 
            size="small" 
            status={record.status === 'failed' ? 'exception' : undefined}
            showInfo={false}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>{progress}%</Text>
        </div>
      )
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language'
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag>{category}</Tag>
    },
    {
      title: '上传时间',
      dataIndex: 'uploadTime',
      key: 'uploadTime'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Document) => (
        <Space>
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="下载">
            <Button 
              type="text" 
              icon={<DownloadOutlined />} 
              size="small"
              disabled={record.status !== 'completed'}
            />
          </Tooltip>
          <Dropdown menu={getActionMenu(record)} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </Space>
      )
    }
  ]

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchText.toLowerCase())
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    const matchesType = typeFilter === 'all' || doc.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>文档管理</Title>
        <Text type="secondary">
          管理您的翻译文档，查看翻译进度和下载结果
        </Text>
      </div>

      {/* 操作栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Search
              placeholder="搜索文档名称"
              allowClear
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
            />
            
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              placeholder="状态筛选"
            >
              <Option value="all">全部状态</Option>
              <Option value="pending">待处理</Option>
              <Option value="translating">翻译中</Option>
              <Option value="completed">已完成</Option>
              <Option value="failed">失败</Option>
            </Select>

            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 120 }}
              placeholder="类型筛选"
            >
              <Option value="all">全部类型</Option>
              <Option value="word">Word</Option>
              <Option value="pdf">PDF</Option>
              <Option value="excel">Excel</Option>
            </Select>
          </Space>

          <Space>
            <Button icon={<FilterOutlined />}>高级筛选</Button>
            <Button 
              type="primary" 
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              上传文档
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 文档表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredDocuments}
          rowKey="id"
          pagination={{
            total: filteredDocuments.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
      </Card>

      {/* 上传文档模态框 */}
      <Modal
        title="上传文档"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={600}
      >
        <Upload.Dragger
          name="file"
          multiple={true}
          action="/api/upload"
          style={{ marginBottom: '16px' }}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 Word (.docx, .doc)、PDF、Excel (.xlsx, .xls) 格式，单个文件不超过50MB
          </p>
        </Upload.Dragger>

        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>翻译设置：</Text>
            <div style={{ marginTop: '8px' }}>
              <Space>
                <Select defaultValue="en-zh" style={{ width: 150 }}>
                  <Option value="en-zh">英文 → 中文</Option>
                  <Option value="zh-en">中文 → 英文</Option>
                </Select>
                <Select defaultValue="pxi" style={{ width: 150 }}>
                  <Option value="pxi">PXI专业术语</Option>
                  <Option value="general">通用术语</Option>
                </Select>
                <Select defaultValue="high" style={{ width: 120 }}>
                  <Option value="fast">快速模式</Option>
                  <Option value="balanced">平衡模式</Option>
                  <Option value="high">高质量模式</Option>
                </Select>
              </Space>
            </div>
          </div>
        </Space>
      </Modal>
    </div>
  )
}

export default DocumentManager
