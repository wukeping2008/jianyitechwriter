const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const AITranslationService = require('../services/AITranslationService')
const DocumentParserService = require('../services/DocumentParserService')
const logger = require('../utils/logger')

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.doc', '.docx', '.pdf', '.txt', '.md']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件格式'))
    }
  }
})

/**
 * @route POST /api/translate/text
 * @desc 翻译单个文本
 * @access Public
 */
router.post('/text', async (req, res, next) => {
  try {
    const {
      text,
      sourceLanguage = 'en',
      targetLanguage = 'zh',
      documentType = 'technical',
      domain = 'instrumentation',
      preserveFormatting = true
    } = req.body

    // 验证输入
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: '翻译文本不能为空',
        code: 'INVALID_INPUT'
      })
    }

    // 调用翻译服务
    const result = await AITranslationService.translateText(text, {
      sourceLanguage,
      targetLanguage,
      documentType,
      domain,
      preserveFormatting
    })

    res.json({
      success: true,
      data: result
    })

  } catch (error) {
    logger.error('文本翻译失败:', error)
    next(error)
  }
})

/**
 * @route POST /api/translate/batch
 * @desc 批量翻译文本
 * @access Public
 */
router.post('/batch', async (req, res, next) => {
  try {
    const {
      texts,
      sourceLanguage = 'en',
      targetLanguage = 'zh',
      documentType = 'technical',
      domain = 'instrumentation',
      preserveFormatting = true,
      batchSize = 5
    } = req.body

    // 验证输入
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        error: '翻译文本数组不能为空',
        code: 'INVALID_INPUT'
      })
    }

    if (texts.length > 50) {
      return res.status(400).json({
        error: '批量翻译最多支持50个文本',
        code: 'BATCH_SIZE_EXCEEDED'
      })
    }

    // 调用批量翻译服务
    const results = await AITranslationService.translateBatch(texts, {
      sourceLanguage,
      targetLanguage,
      documentType,
      domain,
      preserveFormatting,
      batchSize
    })

    res.json({
      success: true,
      data: {
        results: results,
        totalCount: texts.length,
        successCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length
      }
    })

  } catch (error) {
    logger.error('批量翻译失败:', error)
    next(error)
  }
})

/**
 * @route POST /api/translate/document
 * @desc 翻译文档段落
 * @access Public
 */
router.post('/document', async (req, res, next) => {
  try {
    const {
      paragraphs,
      sourceLanguage = 'en',
      targetLanguage = 'zh',
      documentType = 'technical',
      domain = 'instrumentation',
      preserveFormatting = true
    } = req.body

    // 验证输入
    if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
      return res.status(400).json({
        error: '文档段落数组不能为空',
        code: 'INVALID_INPUT'
      })
    }

    // 验证段落格式
    const invalidParagraphs = paragraphs.filter(p => !p.text || typeof p.text !== 'string')
    if (invalidParagraphs.length > 0) {
      return res.status(400).json({
        error: '段落格式无效，每个段落必须包含text字段',
        code: 'INVALID_PARAGRAPH_FORMAT'
      })
    }

    // 设置SSE响应头（用于实时进度推送）
    if (req.headers.accept === 'text/event-stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      })

      // 进度回调函数
      const onProgress = (progress, current, total) => {
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          progress,
          current,
          total
        })}\n\n`)
      }

      try {
        // 调用文档翻译服务
        const result = await AITranslationService.translateDocument(paragraphs, {
          sourceLanguage,
          targetLanguage,
          documentType,
          domain,
          preserveFormatting,
          onProgress
        })

        // 发送最终结果
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          data: result
        })}\n\n`)

        res.end()

      } catch (error) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: error.message
        })}\n\n`)
        res.end()
      }

    } else {
      // 普通HTTP响应
      const result = await AITranslationService.translateDocument(paragraphs, {
        sourceLanguage,
        targetLanguage,
        documentType,
        domain,
        preserveFormatting
      })

      res.json({
        success: true,
        data: result
      })
    }

  } catch (error) {
    logger.error('文档翻译失败:', error)
    if (!res.headersSent) {
      next(error)
    }
  }
})

/**
 * @route POST /api/translate/translate-document
 * @desc 翻译上传的文档
 * @access Public
 */
router.post('/translate-document', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传文件'
      })
    }

    const {
      sourceLanguage = 'en',
      targetLanguage = 'zh',
      domain = 'technical'
    } = req.body

    logger.info(`开始翻译文档: ${req.file.originalname}`)

    // 解析文档内容
    const parsedContent = await DocumentParserService.parseDocument(req.file.path, {
      preserveFormatting: true,
      extractMetadata: true
    })

    if (!parsedContent || !parsedContent.content) {
      return res.status(400).json({
        success: false,
        message: '文档解析失败，请检查文件格式'
      })
    }

    // 翻译文档内容
    const translationResult = await AITranslationService.translateText(parsedContent.content, {
      sourceLanguage,
      targetLanguage,
      documentType: 'technical',
      domain,
      preserveFormatting: true
    })

    // 创建文档记录
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 保存翻译结果到临时存储
    const translatedFilePath = path.join(path.dirname(req.file.path), `translated_${req.file.filename}`)
    fs.writeFileSync(translatedFilePath, translationResult.translatedText, 'utf8')

    // 清理原始上传文件
    fs.unlinkSync(req.file.path)

    res.json({
      success: true,
      data: {
        documentId,
        originalText: parsedContent.content,
        translatedText: translationResult.translatedText,
        fileName: req.file.originalname,
        translatedFilePath,
        metadata: {
          sourceLanguage,
          targetLanguage,
          domain,
          wordCount: parsedContent.content.split(/\s+/).length,
          translationTime: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    logger.error('文档翻译失败:', error)
    
    // 清理上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    
    res.status(500).json({
      success: false,
      message: error.message || '翻译失败，请重试'
    })
  }
})

/**
 * @route GET /api/translate/languages
 * @desc 获取支持的语言列表
 * @access Public
 */
router.get('/languages', (req, res) => {
  try {
    const languages = AITranslationService.getSupportedLanguages()
    res.json({
      success: true,
      data: languages
    })
  } catch (error) {
    logger.error('获取语言列表失败:', error)
    next(error)
  }
})

/**
 * @route GET /api/translate/stats
 * @desc 获取翻译统计信息
 * @access Public
 */
router.get('/stats', (req, res) => {
  try {
    const stats = AITranslationService.getTranslationStats()
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('获取翻译统计失败:', error)
    next(error)
  }
})

/**
 * @route POST /api/translate/terminology/detect
 * @desc 检测文本中的专业术语
 * @access Public
 */
router.post('/terminology/detect', (req, res, next) => {
  try {
    const { text } = req.body

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: '检测文本不能为空',
        code: 'INVALID_INPUT'
      })
    }

    const detectedTerms = AITranslationService.detectTerminology(text)

    res.json({
      success: true,
      data: {
        text: text,
        detectedTerms: detectedTerms,
        termCount: detectedTerms.length
      }
    })

  } catch (error) {
    logger.error('术语检测失败:', error)
    next(error)
  }
})

/**
 * @route POST /api/translate/quality/assess
 * @desc 评估翻译质量
 * @access Public
 */
router.post('/quality/assess', (req, res, next) => {
  try {
    const { originalText, translatedText } = req.body

    if (!originalText || !translatedText) {
      return res.status(400).json({
        error: '原文和译文都不能为空',
        code: 'INVALID_INPUT'
      })
    }

    const terminology = AITranslationService.detectTerminology(originalText)
    const qualityScore = AITranslationService.calculateQualityScore(
      originalText, 
      translatedText, 
      terminology
    )

    res.json({
      success: true,
      data: {
        qualityScore: qualityScore,
        terminology: terminology,
        assessment: {
          excellent: qualityScore >= 0.9,
          good: qualityScore >= 0.8 && qualityScore < 0.9,
          fair: qualityScore >= 0.7 && qualityScore < 0.8,
          poor: qualityScore < 0.7
        }
      }
    })

  } catch (error) {
    logger.error('质量评估失败:', error)
    next(error)
  }
})

module.exports = router
