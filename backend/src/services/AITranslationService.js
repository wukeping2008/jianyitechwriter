const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs').promises
const path = require('path')
const logger = require('../utils/logger')

class AITranslationService {
  constructor() {
    // 初始化Claude客户端
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    })
    
    // 配置参数 - 使用最新Claude 4模型
    this.config = {
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS) || 8000,
      temperature: parseFloat(process.env.CLAUDE_TEMPERATURE) || 0.3,
      timeout: parseInt(process.env.TRANSLATION_TIMEOUT) || 30000,
      maxLength: parseInt(process.env.MAX_TRANSLATION_LENGTH) || 10000,
    }
    
    // 术语库缓存
    this.terminologyCache = new Map()
    this.loadTerminology()
  }

  /**
   * 加载专业术语库
   */
  async loadTerminology() {
    try {
      const terminologyPath = path.join(__dirname, '../../../terminology/jytek-terminology.json')
      const data = await fs.readFile(terminologyPath, 'utf8')
      const terminology = JSON.parse(data)
      
      // 构建术语映射
      terminology.terms.forEach(term => {
        this.terminologyCache.set(term.sourceText.toLowerCase(), {
          target: term.targetText,
          category: term.category,
          domain: term.domain,
          confidence: term.confidence,
          notes: term.notes
        })
        
        // 添加同义词
        if (term.synonyms) {
          term.synonyms.forEach(synonym => {
            this.terminologyCache.set(synonym.toLowerCase(), {
              target: term.targetText,
              category: term.category,
              domain: term.domain,
              confidence: term.confidence * 0.9, // 同义词置信度稍低
              notes: term.notes
            })
          })
        }
      })
      
      logger.info(`已加载 ${this.terminologyCache.size} 个专业术语`)
    } catch (error) {
      logger.error('加载术语库失败:', error)
    }
  }

  /**
   * 构建翻译提示词
   */
  buildTranslationPrompt(text, options = {}) {
    const {
      sourceLanguage = 'English',
      targetLanguage = 'Chinese',
      documentType = 'technical',
      domain = 'instrumentation',
      preserveFormatting = true
    } = options

    // 基础提示词
    let prompt = `你是一个专业的技术文档翻译专家，专门从事PXI模块仪器、数据采集和测试测量领域的翻译工作。

请将以下${sourceLanguage}文本翻译成${targetLanguage}，要求：

1. 保持专业术语的准确性和一致性
2. 保持原文的技术含义和语境
3. 使用简洁、专业的中文表达
4. 对于专业术语，优先使用行业标准翻译`

    if (preserveFormatting) {
      prompt += `
5. 保持原文的格式结构（如标题、列表、表格等）`
    }

    // 添加术语库指导
    const detectedTerms = this.detectTerminology(text)
    if (detectedTerms.length > 0) {
      prompt += `

专业术语参考（请严格按照以下对照翻译）：
${detectedTerms.map(term => `- ${term.source} → ${term.target}`).join('\n')}`
    }

    // 添加领域特定指导
    if (domain === 'pxi') {
      prompt += `

特别注意：
- PXI相关术语保持英文缩写，如"PXI Module"翻译为"PXI模块"
- 保持技术规格的准确性
- 注意模块化仪器的专业表达`
    } else if (domain === 'daq') {
      prompt += `

特别注意：
- 数据采集相关术语要准确
- 采样率、分辨率等参数保持精确
- 信号处理术语要专业`
    }

    prompt += `

原文：
${text}

请直接提供译文，不需要额外说明：`

    return prompt
  }

  /**
   * 检测文本中的专业术语
   */
  detectTerminology(text) {
    const detectedTerms = []
    const textLower = text.toLowerCase()
    
    for (const [source, termData] of this.terminologyCache) {
      if (textLower.includes(source)) {
        detectedTerms.push({
          source: source,
          target: termData.target,
          confidence: termData.confidence,
          category: termData.category
        })
      }
    }
    
    // 按置信度排序
    return detectedTerms.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * 翻译文本
   */
  async translateText(text, options = {}) {
    try {
      // 验证输入
      if (!text || text.trim().length === 0) {
        throw new Error('翻译文本不能为空')
      }
      
      if (text.length > this.config.maxLength) {
        throw new Error(`文本长度超过限制 (${this.config.maxLength} 字符)`)
      }

      // 构建提示词
      const prompt = this.buildTranslationPrompt(text, options)
      
      logger.info(`开始翻译文本，长度: ${text.length} 字符`)
      
      // 调用Claude API
      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const translatedText = response.content[0].text.trim()
      
      // 检测使用的术语
      const usedTerminology = this.detectTerminology(text)
      
      // 计算翻译质量评分
      const qualityScore = this.calculateQualityScore(text, translatedText, usedTerminology)
      
      logger.info(`翻译完成，质量评分: ${qualityScore}`)
      
      return {
        originalText: text,
        translatedText: translatedText,
        sourceLanguage: options.sourceLanguage || 'en',
        targetLanguage: options.targetLanguage || 'zh',
        terminology: usedTerminology,
        qualityScore: qualityScore,
        model: this.config.model,
        timestamp: new Date().toISOString(),
        tokenUsage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        }
      }
      
    } catch (error) {
      logger.error('翻译失败:', error)
      throw new Error(`翻译失败: ${error.message}`)
    }
  }

  /**
   * 批量翻译
   */
  async translateBatch(texts, options = {}) {
    const results = []
    const batchSize = options.batchSize || 5
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const batchPromises = batch.map(text => this.translateText(text, options))
      
      try {
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
        
        // 批次间延迟，避免API限制
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error) {
        logger.error(`批次 ${Math.floor(i / batchSize) + 1} 翻译失败:`, error)
        throw error
      }
    }
    
    return results
  }

  /**
   * 翻译文档段落
   */
  async translateDocument(paragraphs, options = {}) {
    const results = []
    let totalProgress = 0
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]
      
      try {
        const result = await this.translateText(paragraph.text, {
          ...options,
          documentType: paragraph.type || 'paragraph'
        })
        
        results.push({
          ...result,
          paragraphIndex: i,
          paragraphType: paragraph.type || 'paragraph'
        })
        
        totalProgress = Math.round(((i + 1) / paragraphs.length) * 100)
        
        // 触发进度回调
        if (options.onProgress) {
          options.onProgress(totalProgress, i + 1, paragraphs.length)
        }
        
      } catch (error) {
        logger.error(`段落 ${i + 1} 翻译失败:`, error)
        results.push({
          paragraphIndex: i,
          error: error.message,
          originalText: paragraph.text
        })
      }
    }
    
    return {
      results: results,
      totalParagraphs: paragraphs.length,
      successCount: results.filter(r => !r.error).length,
      errorCount: results.filter(r => r.error).length,
      overallQuality: this.calculateOverallQuality(results)
    }
  }

  /**
   * 计算翻译质量评分
   */
  calculateQualityScore(originalText, translatedText, terminology) {
    let score = 0.8 // 基础分数
    
    // 术语使用正确性 (20%)
    const terminologyScore = terminology.length > 0 ? 
      terminology.reduce((sum, term) => sum + term.confidence, 0) / terminology.length : 0.8
    score += terminologyScore * 0.2
    
    // 长度合理性 (10%)
    const lengthRatio = translatedText.length / originalText.length
    const lengthScore = lengthRatio > 0.5 && lengthRatio < 2.0 ? 0.1 : 0.05
    score += lengthScore
    
    // 格式保持 (10%)
    const formatScore = this.checkFormatPreservation(originalText, translatedText)
    score += formatScore * 0.1
    
    return Math.min(Math.max(score, 0), 1) // 限制在0-1之间
  }

  /**
   * 检查格式保持情况
   */
  checkFormatPreservation(original, translated) {
    let score = 1.0
    
    // 检查标题格式
    const originalHeaders = (original.match(/^#+\s/gm) || []).length
    const translatedHeaders = (translated.match(/^#+\s/gm) || []).length
    if (originalHeaders !== translatedHeaders) score -= 0.2
    
    // 检查列表格式
    const originalLists = (original.match(/^[\*\-\+]\s/gm) || []).length
    const translatedLists = (translated.match(/^[\*\-\+]\s/gm) || []).length
    if (originalLists !== translatedLists) score -= 0.2
    
    // 检查代码块
    const originalCode = (original.match(/```/g) || []).length
    const translatedCode = (translated.match(/```/g) || []).length
    if (originalCode !== translatedCode) score -= 0.3
    
    return Math.max(score, 0)
  }

  /**
   * 计算整体质量
   */
  calculateOverallQuality(results) {
    const validResults = results.filter(r => !r.error && r.qualityScore)
    if (validResults.length === 0) return 0
    
    const totalScore = validResults.reduce((sum, r) => sum + r.qualityScore, 0)
    return totalScore / validResults.length
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages() {
    return {
      source: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'zh', name: 'Chinese', nativeName: '中文' },
        { code: 'ja', name: 'Japanese', nativeName: '日本語' },
        { code: 'ko', name: 'Korean', nativeName: '한국어' }
      ],
      target: [
        { code: 'zh', name: 'Chinese', nativeName: '中文' },
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'ja', name: 'Japanese', nativeName: '日本語' },
        { code: 'ko', name: 'Korean', nativeName: '한국어' }
      ]
    }
  }

  /**
   * 获取翻译统计信息
   */
  getTranslationStats() {
    return {
      terminologyCount: this.terminologyCache.size,
      supportedDomains: ['pxi', 'daq', 'test', 'signal', 'measurement'],
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    }
  }
}

module.exports = new AITranslationService()
