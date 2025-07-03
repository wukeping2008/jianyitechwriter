import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Button,
  Progress,
  Tag,
  List,
  Typography,
  Statistic,
  Modal,
  Table,
  Space,
  Alert,
  Tooltip,
  Badge,
  Divider,
  message
} from 'antd'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  FileSearchOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

interface QualityIssue {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  sourceText?: string
  expectedTranslation?: string
  category?: string
}

interface QualityCheck {
  name: string
  score: number
  issues: QualityIssue[]
  details: any
}

interface QualityReport {
  id: string
  documentId: string
  timestamp: string
  score: number
  status: 'passed' | 'failed' | 'processing'
  summary: {
    totalIssues: number
    criticalIssues: number
    highIssues: number
    mediumIssues: number
    lowIssues: number
  }
  checks: Record<string, QualityCheck>
  issues: QualityIssue[]
  recommendations: Array<{
    type: string
    priority: 'high' | 'medium' | 'low'
    message: string
    actions: string[]
  }>
}

interface QualityControlProps {
  documentId?: string
  originalText?: string
  translatedText?: string
  onQualityCheck?: (report: QualityReport) => void
  showDetailedReport?: boolean
}

const QualityControl: React.FC<QualityControlProps> = ({
  documentId,
  originalText,
  translatedText,
  onQualityCheck,
  showDetailedReport = true
}) => {
  const [isChecking, setIsChecking] = useState(false)
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false)

  // 执行质量检查
  const handleQualityCheck = async () => {
    if (!documentId || !originalText || !translatedText) {
      message.warning('请确保文档ID、原文和译文都已提供')
      return
    }

    setIsChecking(true)
    try {
      // 这里应该调用质量检查API
      // const response = await qualityApi.performQualityCheck(documentId, originalText, translatedText)
      
      // 模拟质量检查结果
      const mockReport: QualityReport = {
        id: `qc_${Date.now()}`,
        documentId: documentId,
        timestamp: new Date().toISOString(),
        score: 85,
        status: 'passed',
        summary: {
          totalIssues: 5,
          criticalIssues: 0,
          highIssues: 1,
          mediumIssues: 2,
          lowIssues: 2
        },
        checks: {
          terminology: {
            name: 'terminology',
            score: 90,
            issues: [
              {
                type: 'missing_term_translation',
                severity: 'high',
                message: '术语"SeeSharp"未翻译为"SeeSharp平台"',
                sourceText: 'SeeSharp',
                expectedTranslation: 'SeeSharp平台',
                category: 'seesharp-platform'
              }
            ],
            details: {
              totalTerms: 10,
              correctTerms: 9,
              incorrectTerms: 0,
              missingTerms: 1
            }
          },
          consistency: {
            name: 'consistency',
            score: 85,
            issues: [
              {
                type: 'inconsistent_term_translation',
                severity: 'medium',
                message: '术语翻译不一致',
                sourceText: 'module',
                expectedTranslation: '模块'
              }
            ],
            details: {
              translationConsistency: 85,
              terminologyConsistency: 90,
              formatConsistency: 80
            }
          },
          format: {
            name: 'format',
            score: 80,
            issues: [
              {
                type: 'punctuation_mismatch',
                severity: 'low',
                message: '句号数量不匹配'
              },
              {
                type: 'missing_spaces',
                severity: 'low',
                message: '中英文之间建议添加空格'
              }
            ],
            details: {
              punctuation: 85,
              numberFormat: 100,
              capitalization: 90,
              spacing: 75
            }
          },
          completeness: {
            name: 'completeness',
            score: 95,
            issues: [],
            details: {
              missingTranslations: 0,
              emptySegments: 0,
              untranslatedTerms: 0,
              completenessRatio: 1.0
            }
          },
          accuracy: {
            name: 'accuracy',
            score: 88,
            issues: [
              {
                type: 'low_ai_confidence',
                severity: 'medium',
                message: 'AI翻译置信度较低: 75%'
              }
            ],
            details: {
              aiConfidence: 0.75,
              suspiciousTranslations: 0,
              lengthRatio: 1.2,
              semanticConsistency: 88
            }
          }
        },
        issues: [],
        recommendations: [
          {
            type: 'terminology',
            priority: 'high',
            message: '建议检查术语翻译的准确性和一致性',
            actions: ['使用术语库', '统一术语翻译', '人工审核术语']
          },
          {
            type: 'format',
            priority: 'low',
            message: '建议规范翻译格式',
            actions: ['检查标点符号', '统一数字格式', '规范大小写']
          }
        ]
      }

      // 收集所有问题
      mockReport.issues = Object.values(mockReport.checks).flatMap(check => check.issues)

      setQualityReport(mockReport)
      onQualityCheck?.(mockReport)
      message.success('质量检查完成')

    } catch (error) {
      message.error('质量检查失败')
    } finally {
      setIsChecking(false)
    }
  }

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'red',
      high: 'orange',
      medium: 'gold',
      low: 'blue'
    }
    return colors[severity as keyof typeof colors] || 'default'
  }

  // 获取严重程度图标
  const getSeverityIcon = (severity: string) => {
    const icons = {
      critical: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      high: <WarningOutlined style={{ color: '#fa8c16' }} />,
      medium: <InfoCircleOutlined style={{ color: '#faad14' }} />,
      low: <InfoCircleOutlined style={{ color: '#1890ff' }} />
    }
    return icons[severity as keyof typeof icons] || <InfoCircleOutlined />
  }

  // 获取检查项目名称
  const getCheckName = (checkType: string) => {
    const names = {
      terminology: '术语检查',
      consistency: '一致性检查',
      format: '格式检查',
      completeness: '完整性检查',
      accuracy: '准确性检查'
    }
    return names[checkType as keyof typeof names] || checkType
  }

  // 问题列表列配置
  const issueColumns = [
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)} icon={getSeverityIcon(severity)}>
          {severity.toUpperCase()}
        </Tag>
      )
    },
    {
      title: '问题类型',
      dataIndex: 'type',
      key: 'type',
      width: 150
    },
    {
      title: '问题描述',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true
    },
    {
      title: '相关术语',
      dataIndex: 'sourceText',
      key: 'sourceText',
      width: 120,
      render: (text: string) => text ? <Tag>{text}</Tag> : '-'
    }
  ]

  return (
    <div style={{ padding: '16px' }}>
      {/* 质量检查控制面板 */}
      <Card 
        title={
          <Space>
            <FileSearchOutlined />
            <span>质量控制</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<FileSearchOutlined />}
              onClick={handleQualityCheck}
              loading={isChecking}
              disabled={!documentId || !originalText || !translatedText}
            >
              执行质量检查
            </Button>
            {qualityReport && (
              <>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    // 导出报告逻辑
                    message.info('导出功能开发中')
                  }}
                >
                  导出报告
                </Button>
                <Button
                  icon={<SettingOutlined />}
                  onClick={() => {
                    // 设置规则逻辑
                    message.info('规则设置功能开发中')
                  }}
                >
                  检查规则
                </Button>
              </>
            )}
          </Space>
        }
      >
        {!qualityReport ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <FileSearchOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
            <Paragraph type="secondary" style={{ marginTop: '16px' }}>
              点击"执行质量检查"开始分析翻译质量
            </Paragraph>
          </div>
        ) : (
          <Row gutter={16}>
            {/* 总体质量分数 */}
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="总体质量分数"
                  value={qualityReport.score}
                  suffix="/ 100"
                  valueStyle={{ 
                    color: qualityReport.score >= 80 ? '#3f8600' : qualityReport.score >= 60 ? '#faad14' : '#cf1322'
                  }}
                />
                <Progress
                  percent={qualityReport.score}
                  strokeColor={qualityReport.score >= 80 ? '#52c41a' : qualityReport.score >= 60 ? '#faad14' : '#ff4d4f'}
                  showInfo={false}
                  size="small"
                />
                <div style={{ marginTop: '8px' }}>
                  <Tag color={qualityReport.status === 'passed' ? 'green' : 'red'}>
                    {qualityReport.status === 'passed' ? '通过' : '未通过'}
                  </Tag>
                </div>
              </Card>
            </Col>

            {/* 问题统计 */}
            <Col span={18}>
              <Card size="small" title="问题统计">
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="总问题数"
                      value={qualityReport.summary.totalIssues}
                      prefix={<ExclamationCircleOutlined />}
                    />
                  </Col>
                  <Col span={4}>
                    <Statistic
                      title="严重"
                      value={qualityReport.summary.criticalIssues}
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Col>
                  <Col span={4}>
                    <Statistic
                      title="高"
                      value={qualityReport.summary.highIssues}
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Col>
                  <Col span={4}>
                    <Statistic
                      title="中"
                      value={qualityReport.summary.mediumIssues}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Col>
                  <Col span={4}>
                    <Statistic
                      title="低"
                      value={qualityReport.summary.lowIssues}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        )}
      </Card>

      {/* 详细检查结果 */}
      {qualityReport && showDetailedReport && (
        <>
          <Divider />
          
          {/* 各项检查分数 */}
          <Card title="检查项目详情" style={{ marginTop: '16px' }}>
            <Row gutter={16}>
              {Object.entries(qualityReport.checks).map(([checkType, checkResult]) => (
                <Col span={4.8} key={checkType}>
                  <Card size="small" hoverable>
                    <Statistic
                      title={getCheckName(checkType)}
                      value={checkResult.score}
                      suffix="分"
                      valueStyle={{
                        color: checkResult.score >= 80 ? '#3f8600' : checkResult.score >= 60 ? '#faad14' : '#cf1322'
                      }}
                    />
                    <Progress
                      percent={checkResult.score}
                      strokeColor={checkResult.score >= 80 ? '#52c41a' : checkResult.score >= 60 ? '#faad14' : '#ff4d4f'}
                      showInfo={false}
                      size="small"
                    />
                    {checkResult.issues.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <Badge count={checkResult.issues.length} size="small">
                          <Tag>问题</Tag>
                        </Badge>
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* 问题列表 */}
          {qualityReport.issues.length > 0 && (
            <Card 
              title="发现的问题" 
              style={{ marginTop: '16px' }}
              extra={
                <Button 
                  size="small" 
                  onClick={() => setShowReportModal(true)}
                >
                  查看详细报告
                </Button>
              }
            >
              <Table
                dataSource={qualityReport.issues}
                columns={issueColumns}
                pagination={{ pageSize: 5 }}
                size="small"
                rowKey={(record, index) => `${record.type}_${index}`}
              />
            </Card>
          )}

          {/* 改进建议 */}
          {qualityReport.recommendations.length > 0 && (
            <Card 
              title="改进建议" 
              style={{ marginTop: '16px' }}
              extra={
                <Button 
                  size="small" 
                  onClick={() => setShowRecommendationsModal(true)}
                >
                  查看详细建议
                </Button>
              }
            >
              <List
                dataSource={qualityReport.recommendations.slice(0, 3)}
                renderItem={(recommendation) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Tag color={recommendation.priority === 'high' ? 'red' : recommendation.priority === 'medium' ? 'orange' : 'blue'}>
                          {recommendation.priority.toUpperCase()}
                        </Tag>
                      }
                      title={recommendation.message}
                      description={
                        <Space wrap>
                          {recommendation.actions.map((action, index) => (
                            <Tag key={index}>{action}</Tag>
                          ))}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
        </>
      )}

      {/* 详细报告模态框 */}
      <Modal
        title="详细质量检查报告"
        open={showReportModal}
        onCancel={() => setShowReportModal(false)}
        footer={null}
        width={1000}
      >
        {qualityReport && (
          <div>
            <Alert
              message={`质量分数: ${qualityReport.score}分 (${qualityReport.status === 'passed' ? '通过' : '未通过'})`}
              type={qualityReport.status === 'passed' ? 'success' : 'warning'}
              style={{ marginBottom: '16px' }}
            />
            
            <Table
              dataSource={qualityReport.issues}
              columns={[
                ...issueColumns,
                {
                  title: '期望翻译',
                  dataIndex: 'expectedTranslation',
                  key: 'expectedTranslation',
                  render: (text: string) => text ? <Tag color="green">{text}</Tag> : '-'
                }
              ]}
              pagination={{ pageSize: 10 }}
              size="small"
              rowKey={(record, index) => `${record.type}_${index}`}
            />
          </div>
        )}
      </Modal>

      {/* 改进建议模态框 */}
      <Modal
        title="质量改进建议"
        open={showRecommendationsModal}
        onCancel={() => setShowRecommendationsModal(false)}
        footer={null}
        width={800}
      >
        {qualityReport && (
          <List
            dataSource={qualityReport.recommendations}
            renderItem={(recommendation) => (
              <List.Item>
                <Card size="small" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <Title level={5}>
                        <Tag color={recommendation.priority === 'high' ? 'red' : recommendation.priority === 'medium' ? 'orange' : 'blue'}>
                          {recommendation.priority.toUpperCase()}
                        </Tag>
                        {recommendation.message}
                      </Title>
                      <Paragraph>
                        <strong>建议操作:</strong>
                      </Paragraph>
                      <ul>
                        {recommendation.actions.map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  )
}

export default QualityControl
