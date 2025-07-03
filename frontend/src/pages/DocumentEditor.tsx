import React, { useState } from 'react'
import { 
  Row, 
  Col, 
  Card, 
  Button, 
  Space, 
  Typography, 
  Select, 
  Steps,
  Upload,
  Progress,
  Alert,
  Spin,
  message,
  Modal,
  Descriptions,
  Tag,
  Divider,
  Input
} from 'antd'
import {
  UploadOutlined,
  FileTextOutlined,
  RobotOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InboxOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { Step } = Steps
const { Dragger } = Upload

interface ParsedData {
  type: string
  text: string
  technicalSpecs: Record<string, string>
  sections: Array<{
    title: string
    content: string
  }>
  metadata: {
    filename: string
    fileType: string
    fileSize: number
  }
}

interface GeneratedDocument {
  metadata: {
    title: string
    productType: string
    language: string
    generatedAt: string
  }
  productInfo: {
    productName: string
    category: string
    description: string
    keyFeatures: string[]
    applications: string[]
  }
  sections: Array<{
    id: string
    title: string
    content: string
  }>
  html: string
}

const DocumentEditor: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null)
  const [loading, setLoading] = useState(false)
  const [productType, setProductType] = useState<string>('')
  const [detailLevel, setDetailLevel] = useState<string>('standard')
  const [previewVisible, setPreviewVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  // 支持的文件格式
  const supportedFormats = [
    'Excel files (.xlsx, .xls)',
    'PDF documents (.pdf)', 
    'Word documents (.docx, .doc)',
    'Text files (.txt, .md)',
    'Images (.jpg, .png, .gif)'
  ]

  // 产品类型选项
  const productTypes = [
    { value: 'pxi_module', label: 'PXI Module' },
    { value: 'daq_system', label: 'Data Acquisition System' },
    { value: 'test_equipment', label: 'Test & Measurement Equipment' }
  ]

  // 详细程度选项
  const detailLevels = [
    { value: 'basic', label: 'Basic - Essential information only' },
    { value: 'standard', label: 'Standard - Comprehensive coverage' },
    { value: 'detailed', label: 'Detailed - In-depth technical content' }
  ]

  // 文件上传配置
  const uploadProps = {
    name: 'document',
    multiple: false,
    accept: '.xlsx,.xls,.pdf,.docx,.doc,.txt,.md,.jpg,.jpeg,.png,.gif',
    beforeUpload: (file: any) => {
      const isValidType = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'text/markdown',
        'image/jpeg',
        'image/png',
        'image/gif'
      ].includes(file.type)

      if (!isValidType) {
        message.error('不支持的文件格式！')
        return false
      }

      const isLt100M = file.size / 1024 / 1024 < 100
      if (!isLt100M) {
        message.error('文件大小不能超过100MB！')
        return false
      }

      return false // 阻止自动上传
    },
    onChange: (info: any) => {
      setUploadedFiles(info.fileList)
    }
  }

  // 步骤1: 上传并解析文档
  const handleUploadAndParse = async () => {
    if (uploadedFiles.length === 0) {
      message.error('请先上传文件')
      return
    }

    setLoading(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('document', uploadedFiles[0].originFileObj)

      // 模拟API调用
      setProgress(30)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setProgress(60)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 模拟解析结果
      const mockParsedData: ParsedData = {
        type: 'pdf',
        text: 'PXI-6251 Data Acquisition Module Technical Specifications...',
        technicalSpecs: {
          'Input Channels': '16 single-ended / 8 differential',
          'Resolution': '16-bit',
          'Sample Rate': '1.25 MS/s',
          'Input Range': '±10 V, ±5 V, ±2 V, ±1 V',
          'Accuracy': '±0.05% of reading'
        },
        sections: [
          { title: 'Product Overview', content: 'High-performance data acquisition module...' },
          { title: 'Technical Specifications', content: 'Detailed technical parameters...' }
        ],
        metadata: {
          filename: uploadedFiles[0].name,
          fileType: 'pdf',
          fileSize: uploadedFiles[0].size
        }
      }

      setProgress(100)
      setParsedData(mockParsedData)
      setCurrentStep(1)
      message.success('文档解析完成！')

    } catch (error) {
      message.error('文档解析失败')
    } finally {
      setLoading(false)
    }
  }

  // 步骤2: 生成英文产品手册
  const handleGenerateManual = async () => {
    if (!parsedData) {
      message.error('请先解析文档')
      return
    }

    setLoading(true)
    setProgress(0)

    try {
      // 模拟AI生成过程
      setProgress(20)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setProgress(50)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setProgress(80)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // 模拟生成结果
      const mockDocument: GeneratedDocument = {
        metadata: {
          title: 'PXI-6251 Data Acquisition Module - User Manual & Datasheet',
          productType: productType || 'pxi_module',
          language: 'en',
          generatedAt: new Date().toISOString()
        },
        productInfo: {
          productName: 'PXI-6251 Data Acquisition Module',
          category: 'Data Acquisition',
          description: 'High-performance multifunction data acquisition device designed for PXI systems',
          keyFeatures: [
            '16 single-ended/8 differential analog input channels',
            '16-bit resolution with 1.25 MS/s maximum sample rate',
            '2 analog output channels with 16-bit resolution',
            '24 digital I/O lines (TTL/CMOS compatible)',
            '32-bit counter/timer'
          ],
          applications: [
            'Automated test systems',
            'Data logging and monitoring',
            'Sensor signal conditioning',
            'Control system development'
          ]
        },
        sections: [
          {
            id: 'overview',
            title: 'Product Overview',
            content: 'The PXI-6251 is a high-performance multifunction data acquisition device designed specifically for PXI systems. This device provides 16 analog input channels, 2 analog output channels, and 24 digital I/O lines, making it suitable for a wide range of test and measurement applications.'
          },
          {
            id: 'features',
            title: 'Key Features',
            content: '• 16 single-ended/8 differential analog input channels\n• 16-bit resolution with maximum sample rate of 1.25 MS/s\n• 2 analog output channels with 16-bit resolution\n• 24 digital I/O lines (TTL/CMOS compatible)\n• 32-bit counter/timer\n• Software compatibility with LabVIEW, C/C++, and .NET'
          },
          {
            id: 'specifications',
            title: 'Technical Specifications',
            content: 'Input Channels: 16 single-ended / 8 differential\nResolution: 16-bit\nSample Rate: 1.25 MS/s maximum\nInput Range: ±10 V, ±5 V, ±2 V, ±1 V\nAccuracy: ±0.05% of reading\nOperating Temperature: 0°C to 55°C'
          }
        ],
        html: '<html><head><title>PXI-6251 Manual</title></head><body><h1>PXI-6251 Data Acquisition Module</h1><p>User Manual & Datasheet</p></body></html>'
      }

      setProgress(100)
      setGeneratedDocument(mockDocument)
      setCurrentStep(2)
      message.success('英文产品手册生成完成！')

    } catch (error) {
      message.error('文档生成失败')
    } finally {
      setLoading(false)
    }
  }

  // 预览文档
  const handlePreview = () => {
    if (generatedDocument) {
      setPreviewVisible(true)
    }
  }

  // 下载文档
  const handleDownload = (format: string) => {
    if (!generatedDocument) return

    const filename = `${generatedDocument.productInfo.productName.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`
    
    if (format === 'html') {
      const blob = new Blob([generatedDocument.html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'json') {
      const blob = new Blob([JSON.stringify(generatedDocument, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }

    message.success(`${format.toUpperCase()} 文件下载完成`)
  }

  // 重新开始
  const handleRestart = () => {
    setCurrentStep(0)
    setUploadedFiles([])
    setParsedData(null)
    setGeneratedDocument(null)
    setProductType('')
    setProgress(0)
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>English Product Manual Generator</Title>
        <Text type="secondary">
          Upload Chinese technical documents to generate professional English product manuals (Datasheet + User Manual)
        </Text>
      </div>

      {/* 进度步骤 */}
      <Card style={{ marginBottom: '24px' }}>
        <Steps current={currentStep} style={{ marginBottom: '24px' }}>
          <Step 
            title="Upload & Parse" 
            description="Upload technical documents"
            icon={<FileTextOutlined />}
          />
          <Step 
            title="AI Generation" 
            description="Generate English manual"
            icon={<RobotOutlined />}
          />
          <Step 
            title="Review & Export" 
            description="Preview and download"
            icon={<DownloadOutlined />}
          />
        </Steps>

        {loading && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Progress percent={progress} status="active" />
              <Text type="secondary">
                {currentStep === 0 ? 'Parsing document...' : 'Generating English manual...'}
              </Text>
            </div>
          </div>
        )}
      </Card>

      {/* 步骤1: 文档上传 */}
      {currentStep === 0 && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title="Upload Technical Documents" style={{ height: '100%' }}>
              <Dragger {...uploadProps} style={{ marginBottom: '16px' }}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click or drag files to upload</p>
                <p className="ant-upload-hint">
                  Support for Excel, PDF, Word, Text files and Images
                </p>
              </Dragger>

              {uploadedFiles.length > 0 && (
                <Alert
                  message="File uploaded successfully"
                  description={`${uploadedFiles[0].name} (${(uploadedFiles[0].size / 1024 / 1024).toFixed(2)} MB)`}
                  type="success"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
              )}

              <Button 
                type="primary" 
                size="large" 
                block
                onClick={handleUploadAndParse}
                disabled={uploadedFiles.length === 0 || loading}
                loading={loading}
              >
                Parse Document
              </Button>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Supported Formats" style={{ height: '100%' }}>
              <ul style={{ paddingLeft: '20px' }}>
                {supportedFormats.map((format, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    <Text>{format}</Text>
                  </li>
                ))}
              </ul>
              
              <Divider />
              
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Maximum file size: 100MB<br />
                Supported languages: Chinese, English<br />
                OCR support for images
              </Text>
            </Card>
          </Col>
        </Row>
      )}

      {/* 步骤2: 配置生成选项 */}
      {currentStep === 1 && parsedData && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Parsed Document Information">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Filename">{parsedData.metadata.filename}</Descriptions.Item>
                <Descriptions.Item label="File Type">{parsedData.metadata.fileType.toUpperCase()}</Descriptions.Item>
                <Descriptions.Item label="File Size">{(parsedData.metadata.fileSize / 1024 / 1024).toFixed(2)} MB</Descriptions.Item>
                <Descriptions.Item label="Sections">{parsedData.sections.length}</Descriptions.Item>
                <Descriptions.Item label="Technical Specs">{Object.keys(parsedData.technicalSpecs).length}</Descriptions.Item>
              </Descriptions>

              {Object.keys(parsedData.technicalSpecs).length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Text strong>Key Technical Specifications:</Text>
                  <div style={{ marginTop: '8px' }}>
                    {Object.entries(parsedData.technicalSpecs).slice(0, 5).map(([key, value]) => (
                      <Tag key={key} style={{ margin: '4px' }}>
                        {key}: {value}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Generation Options">
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Text strong>Product Type:</Text>
                  <Select
                    style={{ width: '100%', marginTop: '8px' }}
                    placeholder="Select product type"
                    value={productType}
                    onChange={setProductType}
                  >
                    {productTypes.map(type => (
                      <Option key={type.value} value={type.value}>{type.label}</Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Text strong>Detail Level:</Text>
                  <Select
                    style={{ width: '100%', marginTop: '8px' }}
                    value={detailLevel}
                    onChange={setDetailLevel}
                  >
                    {detailLevels.map(level => (
                      <Option key={level.value} value={level.value}>{level.label}</Option>
                    ))}
                  </Select>
                </div>

                <Button 
                  type="primary" 
                  size="large" 
                  block
                  onClick={handleGenerateManual}
                  disabled={!productType || loading}
                  loading={loading}
                >
                  Generate English Manual
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* 步骤3: 预览和导出 */}
      {currentStep === 2 && generatedDocument && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card 
              title="Generated English Manual"
              extra={
                <Space>
                  <Button icon={<EyeOutlined />} onClick={handlePreview}>
                    Preview
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleRestart}>
                    New Document
                  </Button>
                </Space>
              }
            >
              <Descriptions column={2} bordered size="small" style={{ marginBottom: '16px' }}>
                <Descriptions.Item label="Product Name">{generatedDocument.productInfo.productName}</Descriptions.Item>
                <Descriptions.Item label="Category">{generatedDocument.productInfo.category}</Descriptions.Item>
                <Descriptions.Item label="Language">{generatedDocument.metadata.language.toUpperCase()}</Descriptions.Item>
                <Descriptions.Item label="Generated">{new Date(generatedDocument.metadata.generatedAt).toLocaleString()}</Descriptions.Item>
              </Descriptions>

              <div style={{ marginBottom: '16px' }}>
                <Text strong>Key Features:</Text>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  {generatedDocument.productInfo.keyFeatures.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <Text strong>Sections Generated:</Text>
                <div style={{ marginTop: '8px' }}>
                  {generatedDocument.sections.map(section => (
                    <Tag key={section.id} color="blue" style={{ margin: '4px' }}>
                      {section.title}
                    </Tag>
                  ))}
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Export Options">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button 
                  type="primary" 
                  block 
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload('html')}
                >
                  Download HTML
                </Button>
                
                <Button 
                  block 
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload('json')}
                >
                  Download JSON
                </Button>

                <Alert
                  message="Export Complete"
                  description="Your English product manual has been generated successfully. You can now preview or download the document."
                  type="success"
                  showIcon
                />
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* 预览模态框 */}
      <Modal
        title="Document Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload('html')}>
            Download HTML
          </Button>
        ]}
        width="90%"
        style={{ top: 20 }}
      >
        {generatedDocument && (
          <div 
            style={{ 
              maxHeight: '70vh', 
              overflow: 'auto',
              padding: '20px',
              background: '#fff',
              border: '1px solid #e8e8e8'
            }}
            dangerouslySetInnerHTML={{ __html: generatedDocument.html }}
          />
        )}
      </Modal>
    </div>
  )
}

export default DocumentEditor
