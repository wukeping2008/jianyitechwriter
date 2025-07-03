import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Button,
  Tooltip,
  Select,
  Switch,
  Space,
  Tag,
  Modal,
  List,
  Typography,
  Progress,
  message,
  Popover,
  Badge,
  Input
} from 'antd'
import {
  SaveOutlined,
  HistoryOutlined,
  HighlightOutlined,
  SwapOutlined,
  TeamOutlined,
  SettingOutlined,
  UndoOutlined,
  RedoOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons'

const { TextArea } = Input
const { Option } = Select
const { Text, Title } = Typography

interface TerminologyHighlight {
  term: string
  translation: string
  category: string
  position: number
  length: number
  color: string
  confidence: number
}

interface ComparisonSegment {
  index: number
  original: string
  translated: string
  status: 'matched' | 'modified' | 'added' | 'deleted'
  similarity: number
}

interface Version {
  version: number
  timestamp: string
  userId: string
  metadata: {
    length: number
    wordCount: number
  }
}

interface AdvancedEditorProps {
  sessionId?: string
  initialContent?: {
    original: string
    translated: string
  }
  onContentChange?: (content: string, type: 'original' | 'translated') => void
  onSave?: (content: { original: string; translated: string }) => void
  terminologyData?: any
  readOnly?: boolean
  showComparison?: boolean
}

const AdvancedEditor: React.FC<AdvancedEditorProps> = ({
  sessionId,
  initialContent = { original: '', translated: '' },
  onContentChange,
  onSave,
  terminologyData,
  readOnly = false,
  showComparison = true
}) => {
  // 编辑器状态
  const [content, setContent] = useState(initialContent)
  const [activeEditor, setActiveEditor] = useState<'original' | 'translated'>('original')
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 功能开关
  const [enableTerminologyHighlight, setEnableTerminologyHighlight] = useState(true)
  const [enableRealTimeSync, setEnableRealTimeSync] = useState(true)
  const [enableVersionControl, setEnableVersionControl] = useState(true)

  // 术语高亮
  const [highlightedTerms, setHighlightedTerms] = useState<TerminologyHighlight[]>([])
  const [showTerminologyPanel, setShowTerminologyPanel] = useState(false)

  // 翻译对比
  const [comparisonData, setComparisonData] = useState<ComparisonSegment[]>([])
  const [showComparisonModal, setShowComparisonModal] = useState(false)

  // 版本控制
  const [versions, setVersions] = useState<Version[]>([])
  const [showVersionModal, setShowVersionModal] = useState(false)

  // 协作
  const [collaborators, setCollaborators] = useState<string[]>([])
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false)

  // 自动保存定时器
  const autoSaveTimerRef = useRef<number | null>(null)

  // 内容变化处理
  const handleContentChange = useCallback((newContent: string, type: 'original' | 'translated') => {
    setContent(prev => ({
      ...prev,
      [type]: newContent
    }))
    
    onContentChange?.(newContent, type)
    setHasUnsavedChanges(true)
    
    // 如果启用术语高亮，处理高亮
    if (enableTerminologyHighlight && terminologyData) {
      handleTerminologyHighlight(newContent)
    }
  }, [onContentChange, enableTerminologyHighlight, terminologyData])

  // 术语高亮处理
  const handleTerminologyHighlight = async (text: string) => {
    if (!sessionId || !terminologyData) return

    try {
      // 模拟术语高亮
      const mockTerms: TerminologyHighlight[] = []
      
      // 检查简仪科技术语
      const jytekTerms = ['SeeSharp', '简仪科技', 'JYTEK', 'PXI', '模块仪器']
      jytekTerms.forEach(term => {
        const index = text.indexOf(term)
        if (index !== -1) {
          mockTerms.push({
            term: term,
            translation: term === '简仪科技' ? 'JYTEK' : term,
            category: 'jytek-products',
            position: index,
            length: term.length,
            color: '#1890ff',
            confidence: 1.0
          })
        }
      })
      
      setHighlightedTerms(mockTerms)
    } catch (error) {
      console.error('术语高亮处理失败:', error)
    }
  }

  // 翻译对比
  const handleCompareTranslations = async () => {
    if (!content.original || !content.translated) {
      message.warning('请先输入原文和译文')
      return
    }

    setIsLoading(true)
    try {
      // 模拟对比数据
      const originalSentences = content.original.split(/[。！？.!?]+/).filter(s => s.trim())
      const translatedSentences = content.translated.split(/[。！？.!?]+/).filter(s => s.trim())
      
      const mockComparison: ComparisonSegment[] = []
      const maxLength = Math.max(originalSentences.length, translatedSentences.length)
      
      for (let i = 0; i < maxLength; i++) {
        const original = originalSentences[i] || ''
        const translated = translatedSentences[i] || ''
        
        let status: 'matched' | 'modified' | 'added' | 'deleted' = 'matched'
        if (!original && translated) status = 'added'
        else if (original && !translated) status = 'deleted'
        else if (original !== translated) status = 'modified'
        
        mockComparison.push({
          index: i,
          original: original,
          translated: translated,
          status: status,
          similarity: original && translated ? Math.random() * 0.3 + 0.7 : 0
        })
      }
      
      setComparisonData(mockComparison)
      setShowComparisonModal(true)
    } catch (error) {
      message.error('翻译对比失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 保存内容
  const handleSave = async () => {
    setIsLoading(true)
    try {
      onSave?.(content)
      setHasUnsavedChanges(false)
      message.success('保存成功')
    } catch (error) {
      message.error('保存失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 自动保存
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    
    autoSaveTimerRef.current = window.setTimeout(() => {
      if (hasUnsavedChanges && enableRealTimeSync) {
        handleSave()
      }
    }, 30000) // 30秒后自动保存
  }, [hasUnsavedChanges, enableRealTimeSync])

  // 获取版本历史
  const handleGetVersionHistory = async () => {
    if (!sessionId) return

    try {
      // 模拟版本数据
      const mockVersions: Version[] = [
        {
          version: 3,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          userId: 'user1',
          metadata: { length: content[activeEditor].length, wordCount: content[activeEditor].split(/\s+/).length }
        },
        {
          version: 2,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          userId: 'user1',
          metadata: { length: 80, wordCount: 15 }
        },
        {
          version: 1,
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          userId: 'user1',
          metadata: { length: 50, wordCount: 10 }
        }
      ]
      setVersions(mockVersions)
      setShowVersionModal(true)
    } catch (error) {
      message.error('获取版本历史失败')
    }
  }

  // 恢复版本
  const handleRestoreVersion = async (version: number) => {
    if (!sessionId) return

    try {
      message.success(`已恢复到版本 ${version}`)
      setShowVersionModal(false)
    } catch (error) {
      message.error('恢复版本失败')
    }
  }

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    const colors = {
      matched: 'green',
      modified: 'orange',
      added: 'blue',
      deleted: 'red'
    }
    return colors[status as keyof typeof colors] || 'default'
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    const texts = {
      matched: '匹配',
      modified: '修改',
      added: '新增',
      deleted: '删除'
    }
    return texts[status as keyof typeof texts] || status
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // 监听内容变化，触发自动保存
  useEffect(() => {
    if (hasUnsavedChanges) {
      scheduleAutoSave()
    }
  }, [hasUnsavedChanges, scheduleAutoSave])

  return (
    <div style={{ padding: '16px' }}>
      {/* 工具栏 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={isLoading}
                disabled={!hasUnsavedChanges}
              >
                保存
              </Button>
              
              <Button
                icon={<HistoryOutlined />}
                onClick={handleGetVersionHistory}
                disabled={!enableVersionControl}
              >
                版本历史
              </Button>
              
              <Button
                icon={<SwapOutlined />}
                onClick={handleCompareTranslations}
                loading={isLoading}
                disabled={!showComparison}
              >
                翻译对比
              </Button>
              
              <Button
                icon={<HighlightOutlined />}
                onClick={() => setShowTerminologyPanel(!showTerminologyPanel)}
                type={showTerminologyPanel ? 'primary' : 'default'}
              >
                术语高亮
              </Button>
              
              <Button
                icon={<TeamOutlined />}
                onClick={() => setShowCollaboratorModal(true)}
              >
                协作 <Badge count={collaborators.length} />
              </Button>
            </Space>
          </Col>
          
          <Col>
            <Space>
              <Tooltip title="术语高亮">
                <Switch
                  checked={enableTerminologyHighlight}
                  onChange={setEnableTerminologyHighlight}
                  size="small"
                />
              </Tooltip>
              
              <Tooltip title="实时同步">
                <Switch
                  checked={enableRealTimeSync}
                  onChange={setEnableRealTimeSync}
                  size="small"
                />
              </Tooltip>
              
              <Tooltip title="版本控制">
                <Switch
                  checked={enableVersionControl}
                  onChange={setEnableVersionControl}
                  size="small"
                />
              </Tooltip>
              
              {hasUnsavedChanges && (
                <Tag color="orange">未保存</Tag>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 编辑器区域 */}
      <Row gutter={16}>
        {/* 原文编辑器 */}
        <Col span={showComparison ? 12 : 24}>
          <Card
            title={
              <Space>
                <span>原文</span>
                {activeEditor === 'original' && <Tag color="blue">当前编辑</Tag>}
              </Space>
            }
            size="small"
            extra={
              <Button
                size="small"
                type={activeEditor === 'original' ? 'primary' : 'default'}
                onClick={() => setActiveEditor('original')}
              >
                <EditOutlined />
              </Button>
            }
          >
            <TextArea
              value={content.original}
              onChange={(e) => handleContentChange(e.target.value, 'original')}
              placeholder="请输入原文内容..."
              rows={15}
              disabled={readOnly}
              style={{ 
                fontSize: '14px',
                lineHeight: '1.6',
                fontFamily: 'Microsoft YaHei, Arial, sans-serif'
              }}
            />
          </Card>
        </Col>

        {/* 译文编辑器 */}
        {showComparison && (
          <Col span={12}>
            <Card
              title={
                <Space>
                  <span>译文</span>
                  {activeEditor === 'translated' && <Tag color="blue">当前编辑</Tag>}
                </Space>
              }
              size="small"
              extra={
                <Button
                  size="small"
                  type={activeEditor === 'translated' ? 'primary' : 'default'}
                  onClick={() => setActiveEditor('translated')}
                >
                  <EditOutlined />
                </Button>
              }
            >
              <TextArea
                value={content.translated}
                onChange={(e) => handleContentChange(e.target.value, 'translated')}
                placeholder="请输入译文内容..."
                rows={15}
                disabled={readOnly}
                style={{ 
                  fontSize: '14px',
                  lineHeight: '1.6',
                  fontFamily: 'Arial, sans-serif'
                }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* 术语高亮面板 */}
      {showTerminologyPanel && (
        <Card
          title="识别的术语"
          size="small"
          style={{ marginTop: '16px' }}
          extra={
            <Button size="small" onClick={() => setShowTerminologyPanel(false)}>
              收起
            </Button>
          }
        >
          <Space wrap>
            {highlightedTerms.map((term, index) => (
              <Popover
                key={index}
                content={
                  <div>
                    <p><strong>原文:</strong> {term.term}</p>
                    <p><strong>译文:</strong> {term.translation}</p>
                    <p><strong>类别:</strong> {term.category}</p>
                    <p><strong>置信度:</strong> {Math.round(term.confidence * 100)}%</p>
                  </div>
                }
                title="术语信息"
              >
                <Tag
                  color={term.color}
                  style={{ cursor: 'pointer' }}
                >
                  {term.term}
                </Tag>
              </Popover>
            ))}
          </Space>
          
          {highlightedTerms.length === 0 && (
            <Text type="secondary">暂无识别的术语</Text>
          )}
        </Card>
      )}

      {/* 翻译对比模态框 */}
      <Modal
        title="翻译对比"
        open={showComparisonModal}
        onCancel={() => setShowComparisonModal(false)}
        footer={null}
        width={1000}
      >
        <List
          dataSource={comparisonData}
          renderItem={(segment) => (
            <List.Item>
              <Row style={{ width: '100%' }} gutter={16}>
                <Col span={2}>
                  <Tag color={getStatusColor(segment.status)}>
                    {getStatusText(segment.status)}
                  </Tag>
                </Col>
                <Col span={10}>
                  <Text>{segment.original}</Text>
                </Col>
                <Col span={10}>
                  <Text>{segment.translated}</Text>
                </Col>
                <Col span={2}>
                  <Progress
                    type="circle"
                    size={30}
                    percent={Math.round(segment.similarity * 100)}
                    format={() => `${Math.round(segment.similarity * 100)}%`}
                  />
                </Col>
              </Row>
            </List.Item>
          )}
        />
      </Modal>

      {/* 版本历史模态框 */}
      <Modal
        title="版本历史"
        open={showVersionModal}
        onCancel={() => setShowVersionModal(false)}
        footer={null}
        width={600}
      >
        <List
          dataSource={versions}
          renderItem={(version) => (
            <List.Item
              actions={[
                <Button
                  key="restore"
                  size="small"
                  onClick={() => handleRestoreVersion(version.version)}
                >
                  恢复
                </Button>
              ]}
            >
              <List.Item.Meta
                title={`版本 ${version.version}`}
                description={
                  <Space direction="vertical" size="small">
                    <Text type="secondary">
                      {new Date(version.timestamp).toLocaleString()}
                    </Text>
                    <Text type="secondary">
                      长度: {version.metadata.length} 字符，
                      字数: {version.metadata.wordCount} 词
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* 协作者模态框 */}
      <Modal
        title="协作者管理"
        open={showCollaboratorModal}
        onCancel={() => setShowCollaboratorModal(false)}
        footer={null}
      >
        <List
          dataSource={collaborators}
          renderItem={(collaborator) => (
            <List.Item
              actions={[
                <Button key="remove" size="small" danger>
                  移除
                </Button>
              ]}
            >
              <List.Item.Meta
                title={collaborator}
                description="协作者"
              />
            </List.Item>
          )}
        />
        
        {collaborators.length === 0 && (
          <Text type="secondary">暂无协作者</Text>
        )}
      </Modal>
    </div>
  )
}

export default AdvancedEditor
