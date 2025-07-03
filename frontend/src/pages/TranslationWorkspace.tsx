import React, { useState } from 'react'
import { Row, Col, Card, Button, Upload, Typography, Space, Divider, Progress, Tag, message, Modal } from 'antd'
import {
  UploadOutlined,
  TranslationOutlined,
  DownloadOutlined,
  SaveOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons'
import axios from 'axios'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

interface TranslationResult {
  originalText: string
  translatedText: string
  fileName: string
  fileId: string
}

const TranslationWorkspace: React.FC = () => {
  const [translationProgress, setTranslationProgress] = useState(0)
  const [isTranslating, setIsTranslating] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<any>(null)
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)

  const handleFileUpload = async (info: any) => {
    const { status, response } = info.file
    
    if (status === 'uploading') {
      console.log('文件上传中:', info.file.name)
    } else if (status === 'done') {
      message.success(`${info.file.name} 文件上传成功`)
      setUploadedFile(info.file)
      console.log('上传响应:', response)
    } else if (status === 'error') {
      message.error(`${info.file.name} 文件上传失败`)
    }
  }

  const startTranslation = async () => {
    if (!uploadedFile) {
      message.error('请先上传文件')
      return
    }

    setIsTranslating(true)
    setTranslationProgress(0)

    try {
      // 创建FormData
      const formData = new FormData()
      formData.append('file', uploadedFile.originFileObj)
      formData.append('sourceLanguage', 'en')
      formData.append('targetLanguage', 'zh')
      formData.append('domain', 'technical')

      // 模拟进度更新
      const progressTimer = setInterval(() => {
        setTranslationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressTimer)
            return 90
          }
          return prev + 10
        })
      }, 500)

      // 调用翻译API
      const response = await axios.post('/api/translation/translate-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      clearInterval(progressTimer)
      setTranslationProgress(100)

      if (response.data.success) {
        setTranslationResult({
          originalText: response.data.data.originalText || '原文内容',
          translatedText: response.data.data.translatedText || '翻译内容',
          fileName: uploadedFile.name,
          fileId: response.data.data.documentId
        })
        message.success('翻译完成！')
      } else {
        throw new Error(response.data.message || '翻译失败')
      }
    } catch (error: any) {
      console.error('翻译错误:', error)
      message.error(error.response?.data?.message || '翻译失败，请重试')
    } finally {
      setIsTranslating(false)
    }
  }

  const handlePreview = () => {
    if (!translationResult) {
      message.warning('暂无翻译结果可预览')
      return
    }
    setPreviewVisible(true)
  }

  const handleDownload = async () => {
    if (!translationResult) {
      message.warning('暂无翻译结果可下载')
      return
    }

    try {
      const response = await axios.get(`/api/documents/${translationResult.fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'blob'
      })

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `translated_${translationResult.fileName}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      message.success('文件下载成功！')
    } catch (error: any) {
      console.error('下载错误:', error)
      message.error('下载失败，请重试')
    }
  }

  const handleSaveDraft = async () => {
    if (!translationResult) {
      message.warning('暂无翻译结果可保存')
      return
    }

    try {
      await axios.post('/api/documents/save-draft', {
        fileName: translationResult.fileName,
        originalText: translationResult.originalText,
        translatedText: translationResult.translatedText
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      message.success('草稿保存成功！')
    } catch (error: any) {
      console.error('保存错误:', error)
      message.error('保存失败，请重试')
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>翻译工作台</Title>
        <Text type="secondary">
          上传您的文档，开始AI辅助翻译工作
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* 文件上传区域 */}
        <Col xs={24} lg={12}>
          <Card title="文档上传" extra={<Button icon={<SettingOutlined />}>设置</Button>}>
            <Dragger
              name="file"
              multiple={false}
              beforeUpload={(file) => {
                setUploadedFile({ originFileObj: file, name: file.name })
                return false // 阻止自动上传
              }}
              style={{ marginBottom: '16px' }}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 Word (.docx, .doc)、PDF、Excel (.xlsx, .xls) 格式
              </p>
            </Dragger>

            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>支持的文件格式：</Text>
                <div style={{ marginTop: '8px' }}>
                  <Tag color="blue">Word文档</Tag>
                  <Tag color="green">PDF文件</Tag>
                  <Tag color="orange">Excel表格</Tag>
                </div>
              </div>
              
              <div>
                <Text strong>翻译设置：</Text>
                <div style={{ marginTop: '8px' }}>
                  <Tag>英文 → 中文</Tag>
                  <Tag>PXI专业术语</Tag>
                  <Tag>高质量模式</Tag>
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 翻译控制区域 */}
        <Col xs={24} lg={12}>
          <Card title="翻译控制">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Button
                  type="primary"
                  size="large"
                  icon={<TranslationOutlined />}
                  onClick={startTranslation}
                  loading={isTranslating}
                  disabled={!uploadedFile}
                  block
                >
                  {isTranslating ? '翻译中...' : '开始翻译'}
                </Button>
              </div>

              {translationProgress > 0 && (
                <div>
                  <Text>翻译进度：</Text>
                  <Progress 
                    percent={translationProgress} 
                    status={isTranslating ? 'active' : 'success'}
                    strokeColor="#1890ff"
                  />
                </div>
              )}

              <Divider />

              <Space>
                <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>保存草稿</Button>
                <Button icon={<EyeOutlined />} onClick={handlePreview}>预览</Button>
                <Button icon={<DownloadOutlined />} type="primary" ghost onClick={handleDownload}>
                  下载译文
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 翻译预览区域 */}
      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card title="翻译预览" extra={<Button type="link">全屏查看</Button>}>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card size="small" title="原文" style={{ height: '400px' }}>
                  <div style={{ height: '320px', overflowY: 'auto', padding: '16px', background: '#fafafa' }}>
                    <Paragraph>
                      <Text strong>PXI-6251 Data Acquisition Device</Text>
                    </Paragraph>
                    <Paragraph>
                      The PXI-6251 is a high-performance multifunction data acquisition (DAQ) device 
                      for PXI systems. It provides analog input, analog output, and digital I/O 
                      capabilities in a single module.
                    </Paragraph>
                    <Paragraph>
                      <Text strong>Key Features:</Text>
                    </Paragraph>
                    <ul>
                      <li>16 analog input channels with 16-bit resolution</li>
                      <li>2 analog output channels with 16-bit resolution</li>
                      <li>24 digital I/O lines</li>
                      <li>Maximum sampling rate of 1.25 MS/s</li>
                    </ul>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} lg={12}>
                <Card size="small" title="译文" style={{ height: '400px' }}>
                  <div style={{ height: '320px', overflowY: 'auto', padding: '16px', background: '#f6ffed' }}>
                    <Paragraph>
                      <Text strong>PXI-6251 数据采集设备</Text>
                    </Paragraph>
                    <Paragraph>
                      PXI-6251是一款适用于PXI系统的高性能多功能数据采集(DAQ)设备。
                      它在单个模块中提供模拟输入、模拟输出和数字I/O功能。
                    </Paragraph>
                    <Paragraph>
                      <Text strong>主要特性：</Text>
                    </Paragraph>
                    <ul>
                      <li>16个模拟输入通道，16位分辨率</li>
                      <li>2个模拟输出通道，16位分辨率</li>
                      <li>24条数字I/O线</li>
                      <li>最大采样率1.25 MS/s</li>
                    </ul>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 术语提示区域 */}
      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card title="术语提示" size="small">
            <Space wrap>
              <Tag color="blue">PXI → PXI (保持原文)</Tag>
              <Tag color="green">Data Acquisition → 数据采集</Tag>
              <Tag color="orange">Analog Input → 模拟输入</Tag>
              <Tag color="purple">Digital I/O → 数字I/O</Tag>
              <Tag color="cyan">Sampling Rate → 采样率</Tag>
              <Tag color="red">Resolution → 分辨率</Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 预览模态框 */}
      <Modal
        title="翻译结果预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
            下载译文
          </Button>
        ]}
      >
        {translationResult && (
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" title="原文" style={{ height: '500px' }}>
                <div style={{ height: '420px', overflowY: 'auto', padding: '16px', background: '#fafafa' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                    {translationResult.originalText}
                  </pre>
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="译文" style={{ height: '500px' }}>
                <div style={{ height: '420px', overflowY: 'auto', padding: '16px', background: '#f6ffed' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                    {translationResult.translatedText}
                  </pre>
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </Modal>
    </div>
  )
}

export default TranslationWorkspace
