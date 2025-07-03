const AITranslationService = require('../../src/services/AITranslationService')
const DocumentGeneratorService = require('../../src/services/DocumentGeneratorService')

describe('Claude API连接测试', () => {
  // 设置测试超时时间为30秒
  jest.setTimeout(30000)

  describe('AI翻译服务测试', () => {
    test('应该能够成功连接Claude API', async () => {
      // 测试简单的翻译功能
      const testText = 'Hello, this is a test message.'
      
      try {
        const result = await AITranslationService.translateText(testText, {
          sourceLanguage: 'English',
          targetLanguage: 'Chinese'
        })
        
        expect(result).toBeDefined()
        expect(result.translatedText).toBeDefined()
        expect(result.model).toBe('claude-sonnet-4-20250514')
        expect(result.tokenUsage).toBeDefined()
        expect(result.qualityScore).toBeGreaterThan(0)
        
        console.log('✅ Claude API连接成功')
        console.log('原文:', result.originalText)
        console.log('译文:', result.translatedText)
        console.log('模型:', result.model)
        console.log('Token使用:', result.tokenUsage)
        
      } catch (error) {
        console.error('❌ Claude API连接失败:', error.message)
        throw error
      }
    })

    test('应该能够处理专业术语翻译', async () => {
      const technicalText = 'PXI Module with high-resolution ADC for data acquisition systems.'
      
      try {
        const result = await AITranslationService.translateText(technicalText, {
          sourceLanguage: 'English',
          targetLanguage: 'Chinese',
          domain: 'pxi'
        })
        
        expect(result).toBeDefined()
        expect(result.translatedText).toContain('PXI')
        expect(result.terminology.length).toBeGreaterThan(0)
        
        console.log('✅ 专业术语翻译测试通过')
        console.log('检测到的术语:', result.terminology)
        
      } catch (error) {
        console.error('❌ 专业术语翻译测试失败:', error.message)
        throw error
      }
    })

    test('应该能够获取翻译统计信息', () => {
      const stats = AITranslationService.getTranslationStats()
      
      expect(stats).toBeDefined()
      expect(stats.model).toBe('claude-sonnet-4-20250514')
      expect(stats.maxTokens).toBe(8000)
      expect(stats.terminologyCount).toBeGreaterThan(0)
      
      console.log('✅ 翻译统计信息获取成功')
      console.log('统计信息:', stats)
    })
  })

  describe('文档生成服务测试', () => {
    test('应该能够识别产品类型', async () => {
      const mockParsedData = {
        text: 'PXI-6251 is a high-performance multifunction DAQ device with 16-bit resolution ADC.',
        technicalSpecs: {
          'Resolution': '16-bit',
          'Channels': '16 AI',
          'Sample Rate': '1.25 MS/s'
        },
        metadata: {
          filename: 'test-product.txt',
          fileType: 'text',
          parsedAt: new Date().toISOString()
        }
      }
      
      try {
        const productType = await DocumentGeneratorService.identifyProductType(mockParsedData)
        
        expect(productType).toBeDefined()
        expect(['pxi_module', 'daq_system', 'test_equipment'].includes(productType)).toBe(true)
        
        console.log('✅ 产品类型识别成功:', productType)
        
      } catch (error) {
        console.error('❌ 产品类型识别失败:', error.message)
        throw error
      }
    })

    test('应该能够提取产品信息', async () => {
      const mockParsedData = {
        text: 'The PXI-6251 is a high-performance multifunction DAQ device featuring 16-bit resolution and 1.25 MS/s sampling rate.',
        technicalSpecs: {
          'Model': 'PXI-6251',
          'Resolution': '16-bit',
          'Sample Rate': '1.25 MS/s'
        }
      }
      
      try {
        const productInfo = await DocumentGeneratorService.extractProductInfo(mockParsedData)
        
        expect(productInfo).toBeDefined()
        expect(productInfo.productName).toBeDefined()
        expect(productInfo.category).toBeDefined()
        expect(productInfo.keyFeatures).toBeInstanceOf(Array)
        expect(productInfo.applications).toBeInstanceOf(Array)
        
        console.log('✅ 产品信息提取成功')
        console.log('产品信息:', productInfo)
        
      } catch (error) {
        console.error('❌ 产品信息提取失败:', error.message)
        throw error
      }
    })

    test('应该能够获取可用模板', () => {
      const templates = DocumentGeneratorService.getAvailableTemplates()
      
      expect(templates).toBeDefined()
      expect(templates.length).toBeGreaterThan(0)
      expect(templates[0]).toHaveProperty('id')
      expect(templates[0]).toHaveProperty('name')
      expect(templates[0]).toHaveProperty('sections')
      
      console.log('✅ 模板获取成功')
      console.log('可用模板数量:', templates.length)
      templates.forEach(template => {
        console.log(`- ${template.name} (${template.sections.length} 个章节)`)
      })
    })
  })

  describe('环境配置测试', () => {
    test('应该正确加载环境变量', () => {
      expect(process.env.CLAUDE_API_KEY).toBeDefined()
      expect(process.env.CLAUDE_MODEL).toBe('claude-sonnet-4-20250514')
      expect(process.env.CLAUDE_MAX_TOKENS).toBe('8000')
      
      console.log('✅ 环境变量配置正确')
      console.log('Claude模型:', process.env.CLAUDE_MODEL)
      console.log('最大Token数:', process.env.CLAUDE_MAX_TOKENS)
    })

    test('应该能够加载专业术语库', async () => {
      // 等待术语库加载完成
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const stats = AITranslationService.getTranslationStats()
      expect(stats.terminologyCount).toBeGreaterThan(0)
      
      console.log('✅ 专业术语库加载成功')
      console.log('术语数量:', stats.terminologyCount)
    })
  })
})
