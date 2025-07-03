import React, { useState, useEffect } from 'react'
import {
  Upload,
  Button,
  Card,
  Progress,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  Switch,
  message,
  Tooltip,
  Divider,
  Row,
  Col,
  Statistic,
  Alert
} from 'antd'
import {
  InboxOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import type { UploadProps, TableColumnsType } from 'antd'
import { batchApi } from '../services/batchApi'

const { Dragger } = Upload
const { Option } = Select

interface BatchTask {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial' | 'cancelled'
  progress: {
    total: number
    completed: number
    failed: number
    percentage: number
  }
  fileCount: number
  createdAt: string
  completedAt?: string
  processingTime?: number
  retryCount: number
  options?: {
    targetLanguage: string
    outputFormat: string
    includeOriginal: boolean
    generateEnglishManual: boolean
  }
}

interface BatchResult {
  fileIndex: number
  fileName: string
  status: 'completed' | 'failed'
  originalDocument?: any
  translation?: any
  englishManual?: any
  error?: string
  processingTime: number
}

const BatchProcessor: React.FC = () => {
  const [tasks, setTasks] = useState<BatchTask[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [resultModalVisible, setResultModalVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState<BatchTask | null>(null)
  const [taskResults, setTaskResults] = useState<BatchResult[]>([])
  const [stats, setStats] = useState<any>({})
  const [form] = Form.useForm()

  // 获取任务列表
  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await batchApi.getAllTasks()
      if (response.success) {
        setTasks(response.data.tasks)
      }
    } catch (error) {
      message.error('获取任务列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取统计信息
  const fetchStats = async () => {
    try {
      const response = await batchApi.getStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('获取统计信息失败:', error)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchStats()
    
    // 设置定时刷新
    const interval = setInterval(() => {
      fetchTasks()
      fetchStats()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'files',
    multiple: true,
    accept: '.xlsx,.xls,.pdf,.docx,.doc,.txt,.md,.jpg,.jpeg,.png,.gif,.bmp',
    beforeUpload: (file) => {
      setSelectedFiles(prev => [...prev, file])
      return false // 阻止自动上传
    },
    onRemove: (file) => {
      setSelectedFiles(prev => prev.filter(f => f.name !== file.name))
    },
    fileList: selectedFiles.map((file, index) => ({
      uid: `${file.name}-${index}`,
      name: file.name,
      status: 'done' as const,
      size: file.size
    }))
  }

  // 创建批量任务
  const handleCreateTask = async (values: any) => {
    if (selectedFiles.length === 0) {
      message.error('请先选择文件')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })
      
      Object.keys(values).forEach(key => {
        formData.append(key, values[key])
      })

      const response = await batchApi.createBatchTask(formData)
      
      if (response.success) {
        message.success('批量任务创建成功')
        setCreateModalVisible(false)
        setSelectedFiles([])
        form.resetFields()
        fetchTasks()
      } else {
        message.error(response.message || '创建任务失败')
      }
    } catch (error) {
      message.error('创建任务失败')
    } finally {
      setUploading(false)
    }
  }

  // 查看任务结果
  const handleViewResults = async (task: BatchTask) => {
    try {
      const response = await batchApi.getTaskResults(task.id)
      if (response.success) {
        setSelectedTask(task)
        setTaskResults(response.data.results)
        setResultModalVisible(true)
      }
    } catch (error) {
      message.error('获取任务结果失败')
    }
  }

  // 重试任务
  const handleRetryTask = async (taskId: string) => {
    try {
      const response = await batchApi.retryTask(taskId)
      if (response.success) {
        message.success('任务重试已启动')
        fetchTasks()
      }
    } catch (error) {
      message.error('重试任务失败')
    }
  }

  // 取消任务
  const handleCancelTask = async (taskId: string) => {
    try {
      const response = await batchApi.cancelTask(taskId)
      if (response.success) {
        message.success('任务已取消')
        fetchTasks()
      }
    } catch (error) {
      message.error('取消任务失败')
    }
  }

  // 导出结果
  const handleExportResults = async (taskId: string, format: string = 'json') => {
    try {
      const response = await batchApi.exportTaskResults(taskId, format)
      // 处理文件下载
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch_results_${taskId}_${Date.now()}.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
      message.success('结果导出成功')
    } catch (error) {
      message.error('导出结果失败')
    }
  }

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusConfig = {
      pending: { color: 'default', text: '等待中' },
      processing: { color: 'processing', text: '处理中' },
      completed: { color: 'success', text: '已完成' },
      failed: { color: 'error', text: '失败' },
      partial: { color: 'warning', text: '部分完成' },
      cancelled: { color: 'default', text: '已取消' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // 任务表格列定义
  const taskColumns: TableColumnsType<BatchTask> = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      render: (id: string) => (
        <Tooltip title={id}>
          <span>{id.substring(0, 16)}...</span>
        </Tooltip>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '进度',
      key: 'progress',
      width: 200,
      render: (_, record) => (
        <div>
          <Progress 
            percent={record.progress.percentage} 
            size="small"
            status={record.status === 'failed' ? 'exception' : 'normal'}
          />
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.progress.completed}/{record.progress.total} 
            {record.progress.failed > 0 && ` (失败: ${record.progress.failed})`}
          </div>
        </div>
      )
    },
    {
      title: '文件数量',
      dataIndex: 'fileCount',
      key: 'fileCount',
      width: 100
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (time: string) => new Date(time).toLocaleString()
    },
    {
      title: '处理时间',
      dataIndex: 'processingTime',
      key: 'processingTime',
      width: 100,
      render: (time?: number) => time ? `${Math.round(time / 1000)}s` : '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {(record.status === 'completed' || record.status === 'partial') && (
            <>
              <Tooltip title="查看结果">
                <Button 
                  type="link" 
                  icon={<EyeOutlined />} 
                  onClick={() => handleViewResults(record)}
                />
              </Tooltip>
              <Tooltip title="导出结果">
                <Button 
                  type="link" 
                  icon={<DownloadOutlined />} 
                  onClick={() => handleExportResults(record.id)}
                />
              </Tooltip>
            </>
          )}
          {record.status === 'failed' && record.retryCount < 3 && (
            <Tooltip title="重试">
              <Button 
                type="link" 
                icon={<ReloadOutlined />} 
                onClick={() => handleRetryTask(record.id)}
              />
            </Tooltip>
          )}
          {record.status === 'pending' && (
            <Tooltip title="取消">
              <Button 
                type="link" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => handleCancelTask(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ]

  // 结果表格列定义
  const resultColumns: TableColumnsType<BatchResult> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '处理时间',
      dataIndex: 'processingTime',
      key: 'processingTime',
      render: (time: number) => `${Math.round(time / 1000)}s`
    },
    {
      title: '错误信息',
      dataIndex: 'error',
      key: 'error',
      render: (error?: string) => error ? (
        <Tooltip title={error}>
          <span style={{ color: 'red' }}>{error.substring(0, 50)}...</span>
        </Tooltip>
      ) : '-'
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总任务数"
                value={stats.totalTasks || 0}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="队列中"
                value={stats.queueLength || 0}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="处理中"
                value={stats.activeTasks || 0}
                prefix={<PlayCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已完成"
                value={stats.completedTasks || 0}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card 
        title="批量文档处理"
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建批量任务
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchTasks}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={taskColumns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个任务`
          }}
        />
      </Card>

      {/* 创建任务模态框 */}
      <Modal
        title="创建批量处理任务"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          setSelectedFiles([])
          form.resetFields()
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTask}
          initialValues={{
            targetLanguage: 'en',
            outputFormat: 'docx',
            includeOriginal: false,
            generateEnglishManual: false
          }}
        >
          <Form.Item label="选择文件">
            <Dragger {...uploadProps} style={{ marginBottom: '16px' }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 Excel、PDF、Word、文本、图片等格式，最多50个文件
              </p>
            </Dragger>
            {selectedFiles.length > 0 && (
              <Alert
                message={`已选择 ${selectedFiles.length} 个文件`}
                type="info"
                showIcon
                style={{ marginTop: '8px' }}
              />
            )}
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="targetLanguage"
                label="目标语言"
                rules={[{ required: true, message: '请选择目标语言' }]}
              >
                <Select>
                  <Option value="en">英文</Option>
                  <Option value="zh">中文</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="outputFormat"
                label="输出格式"
                rules={[{ required: true, message: '请选择输出格式' }]}
              >
                <Select>
                  <Option value="docx">Word文档</Option>
                  <Option value="pdf">PDF文档</Option>
                  <Option value="txt">文本文件</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="includeOriginal"
                label="包含原文"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="generateEnglishManual"
                label="生成英文手册"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={uploading}
                disabled={selectedFiles.length === 0}
              >
                创建任务
              </Button>
              <Button onClick={() => setCreateModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看结果模态框 */}
      <Modal
        title={`任务结果 - ${selectedTask?.id}`}
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={[
          <Button key="export" onClick={() => selectedTask && handleExportResults(selectedTask.id)}>
            导出结果
          </Button>,
          <Button key="close" onClick={() => setResultModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={1000}
      >
        {selectedTask && (
          <div>
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={6}>
                <Statistic title="总文件数" value={selectedTask.progress.total} />
              </Col>
              <Col span={6}>
                <Statistic title="成功" value={selectedTask.progress.completed} />
              </Col>
              <Col span={6}>
                <Statistic title="失败" value={selectedTask.progress.failed} />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="成功率" 
                  value={Math.round((selectedTask.progress.completed / selectedTask.progress.total) * 100)} 
                  suffix="%" 
                />
              </Col>
            </Row>
            
            <Table
              columns={resultColumns}
              dataSource={taskResults}
              rowKey="fileIndex"
              pagination={false}
              scroll={{ y: 400 }}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default BatchProcessor
