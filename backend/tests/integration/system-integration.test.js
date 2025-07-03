const request = require('supertest')
const app = require('../../src/app')
const SystemIntegrationService = require('../../src/services/SystemIntegrationService')
const PerformanceOptimizationService = require('../../src/services/PerformanceOptimizationService')
const SecurityService = require('../../src/services/SecurityService')

describe('系统集成测试', () => {
  let authToken
  let testUser

  beforeAll(async () => {
    // 初始化测试环境
    await SystemIntegrationService.initialize()
    await PerformanceOptimizationService.initialize()
    await SecurityService.initialize()

    // 创建测试用户并获取认证令牌
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@jianyi.tech',
        password: 'TestPass123!',
        fullName: '测试用户'
      })

    expect(registerResponse.status).toBe(201)

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@jianyi.tech',
        password: 'TestPass123!'
      })

    expect(loginResponse.status).toBe(200)
    authToken = loginResponse.body.data.token
    testUser = loginResponse.body.data.user
  })

  afterAll(async () => {
    // 清理测试数据
    await request(app)
      .delete(`/api/users/${testUser.id}`)
      .set('Authorization', `Bearer ${authToken}`)
  })

  describe('系统状态和健康检查', () => {
    test('应该能够获取系统状态', async () => {
      const response = await request(app)
        .get('/api/system/status')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('isInitialized')
      expect(response.body.data).toHaveProperty('services')
      expect(response.body.data).toHaveProperty('performance')
    })

    test('应该能够获取健康检查信息', async () => {
      const response = await request(app)
        .get('/api/system/health')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('status')
      expect(response.body.data).toHaveProperty('timestamp')
      expect(response.body.data).toHaveProperty('services')
    })

    test('应该能够获取性能指标', async () => {
      const response = await request(app)
        .get('/api/system/metrics')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('totalRequests')
      expect(response.body.data).toHaveProperty('averageResponseTime')
      expect(response.body.data).toHaveProperty('errorRate')
    })
  })

  describe('工作流集成测试', () => {
    test('应该能够获取工作流列表', async () => {
      const response = await request(app)
        .get('/api/system/workflows')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.workflows).toBeInstanceOf(Array)
      expect(response.body.data.workflows.length).toBeGreaterThan(0)
    })

    test('应该能够获取工作流详情', async () => {
      const response = await request(app)
        .get('/api/system/workflows/documentGeneration')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data).toHaveProperty('name')
      expect(response.body.data).toHaveProperty('configuration')
    })
  })

  describe('模板管理集成测试', () => {
    let templateId

    test('应该能够创建模板', async () => {
      const templateData = {
        name: '测试模板',
        description: '集成测试用模板',
        type: 'datasheet',
        productCategory: 'pxi_module',
        structure: {
          sections: [
            {
              id: 'overview',
              name: 'overview',
              title: '产品概述',
              order: 1,
              required: true,
              type: 'text',
              template: '{{productName}}是一款{{productType}}',
              placeholder: '请输入产品概述'
            }
          ],
          variables: [
            {
              name: 'productName',
              type: 'text',
              description: '产品名称',
              required: true
            }
          ]
        }
      }

      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      templateId = response.body.data.templateId
    })

    test('应该能够生成文档', async () => {
      const variables = {
        productName: 'PXI-1234',
        productType: 'PXI模块'
      }

      const response = await request(app)
        .post(`/api/templates/${templateId}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ variables })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('content')
    })

    test('应该能够删除模板', async () => {
      const response = await request(app)
        .delete(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('批量处理集成测试', () => {
    test('应该能够获取批量处理状态', async () => {
      const response = await request(app)
        .get('/api/batch/status')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    test('应该能够获取批量处理统计', async () => {
      const response = await request(app)
        .get('/api/batch/statistics')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('totalBatches')
    })
  })

  describe('质量控制集成测试', () => {
    test('应该能够获取质量检查配置', async () => {
      const response = await request(app)
        .get('/api/quality/configuration')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('dimensions')
    })

    test('应该能够执行质量检查', async () => {
      const checkData = {
        originalText: 'Hello world',
        translatedText: '你好世界',
        options: {
          checkTerminology: true,
          checkConsistency: true
        }
      }

      const response = await request(app)
        .post('/api/quality/check')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('overallScore')
    })
  })

  describe('高级编辑器集成测试', () => {
    test('应该能够获取编辑器配置', async () => {
      const response = await request(app)
        .get('/api/editor/configuration')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('features')
    })

    test('应该能够获取术语建议', async () => {
      const response = await request(app)
        .post('/api/editor/terminology-suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'measurement instrument',
          context: 'technical'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.suggestions).toBeInstanceOf(Array)
    })
  })

  describe('性能和安全集成测试', () => {
    test('应该能够记录性能指标', async () => {
      const response = await request(app)
        .post('/api/system/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceName: 'test',
          responseTime: 100,
          isError: false
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    test('应该能够处理恶意输入', async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '<script>alert("xss")</script>',
          description: 'SELECT * FROM users',
          type: 'datasheet'
        })

      // 应该被安全中间件阻止
      expect(response.status).toBe(400)
      expect(response.body.code).toBe('MALICIOUS_INPUT')
    })

    test('应该能够处理速率限制', async () => {
      // 快速发送多个请求来触发速率限制
      const promises = []
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app)
            .get('/api/system/status')
            .set('Authorization', `Bearer ${authToken}`)
        )
      }

      const responses = await Promise.all(promises)
      const rateLimitedResponses = responses.filter(res => res.status === 429)
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('端到端工作流测试', () => {
    test('完整的文档生成工作流', async () => {
      // 1. 创建模板
      const templateResponse = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E测试模板',
          description: '端到端测试模板',
          type: 'datasheet',
          productCategory: 'pxi_module',
          structure: {
            sections: [
              {
                id: 'overview',
                name: 'overview',
                title: '产品概述',
                order: 1,
                required: true,
                type: 'text',
                template: '{{productName}}是一款{{productType}}',
                placeholder: '请输入产品概述'
              }
            ],
            variables: [
              {
                name: 'productName',
                type: 'text',
                description: '产品名称',
                required: true
              },
              {
                name: 'productType',
                type: 'text',
                description: '产品类型',
                required: true
              }
            ]
          }
        })

      expect(templateResponse.status).toBe(201)
      const templateId = templateResponse.body.data.templateId

      // 2. 执行文档生成工作流
      const workflowResponse = await request(app)
        .post('/api/system/workflows/document-generation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: templateId,
          variables: {
            productName: 'PXI-5678',
            productType: 'PXI数据采集模块'
          },
          options: {
            enableQualityCheck: true
          }
        })

      expect(workflowResponse.status).toBe(200)
      expect(workflowResponse.body.success).toBe(true)
      expect(workflowResponse.body.data).toHaveProperty('workflowId')
      expect(workflowResponse.body.data).toHaveProperty('content')
      expect(workflowResponse.body.data).toHaveProperty('quality')

      // 3. 清理
      await request(app)
        .delete(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
    })

    test('完整的质量保证工作流', async () => {
      const workflowResponse = await request(app)
        .post('/api/system/workflows/quality-assurance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentId: 'test-doc-123',
          originalText: 'This is a test document for quality assurance.',
          translatedText: '这是一个用于质量保证的测试文档。',
          options: {
            strictMode: false,
            includeRecommendations: true
          }
        })

      expect(workflowResponse.status).toBe(200)
      expect(workflowResponse.body.success).toBe(true)
      expect(workflowResponse.body.data).toHaveProperty('workflowId')
      expect(workflowResponse.body.data).toHaveProperty('analysis')
      expect(workflowResponse.body.data).toHaveProperty('overallScore')
      expect(workflowResponse.body.data).toHaveProperty('recommendations')
    })
  })

  describe('错误处理和恢复测试', () => {
    test('应该能够处理无效的模板ID', async () => {
      const response = await request(app)
        .get('/api/templates/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })

    test('应该能够处理无效的工作流参数', async () => {
      const response = await request(app)
        .post('/api/system/workflows/document-generation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 缺少必需的参数
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    test('应该能够处理未授权访问', async () => {
      const response = await request(app)
        .get('/api/system/status')
        // 不提供认证令牌

      expect(response.status).toBe(401)
    })
  })

  describe('并发和负载测试', () => {
    test('应该能够处理并发请求', async () => {
      const concurrentRequests = 20
      const promises = []

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/system/health')
        )
      }

      const responses = await Promise.all(promises)
      
      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })

    test('应该能够处理大量数据', async () => {
      const largeText = 'A'.repeat(10000) // 10KB文本
      
      const response = await request(app)
        .post('/api/quality/check')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalText: largeText,
          translatedText: largeText,
          options: {
            checkTerminology: false,
            checkConsistency: false
          }
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })
})
