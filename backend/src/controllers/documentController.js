const DocumentParserService = require('../services/DocumentParserService')
const DocumentGeneratorService = require('../services/DocumentGeneratorService')
const logger = require('../utils/logger')
const path = require('path')
const fs = require('fs').promises

class DocumentController {
  /**
   * 上传并解析文档
   */
  async uploadAndParse(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传文件'
        })
      }

      const { originalname, path: filePath } = req.file
      
      logger.info(`开始处理上传文件: ${originalname}`)

      // 解析文档
      const parsedData = await DocumentParserService.parseDocument(filePath, originalname)

      // 清理上传的临时文件
      try {
        await fs.unlink(filePath)
      } catch (error) {
        logger.warn('清理临时文件失败:', error)
      }

      res.json({
        success: true,
        message: '文档解析成功',
        data: {
          filename: originalname,
          parsedData: parsedData,
          supportedFormats: DocumentParserService.getSupportedFormats()
        }
      })

    } catch (error) {
      logger.error('文档上传解析失败:', error)
      
      // 清理上传的临时文件
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path)
        } catch (cleanupError) {
          logger.warn('清理临时文件失败:', cleanupError)
        }
      }

      res.status(500).json({
        success: false,
        message: error.message || '文档解析失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }

  /**
   * 批量上传并解析文档
   */
  async uploadAndParseMultiple(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请上传文件'
        })
      }

      logger.info(`开始批量处理 ${req.files.length} 个文件`)

      const filePaths = req.files.map(file => file.path)
      const results = await DocumentParserService.parseMultipleDocuments(filePaths)

      // 清理上传的临时文件
      for (const file of req.files) {
        try {
          await fs.unlink(file.path)
        } catch (error) {
          logger.warn(`清理临时文件失败: ${file.originalname}`, error)
        }
      }

      const successCount = results.filter(r => r.success).length
      const errorCount = results.filter(r => !r.success).length

      res.json({
        success: true,
        message: `批量解析完成: ${successCount} 成功, ${errorCount} 失败`,
        data: {
          results: results,
          summary: {
            total: req.files.length,
            success: successCount,
            error: errorCount
          }
        }
      })

    } catch (error) {
      logger.error('批量文档解析失败:', error)
      
      // 清理上传的临时文件
      if (req.files) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path)
          } catch (cleanupError) {
            logger.warn('清理临时文件失败:', cleanupError)
          }
        }
      }

      res.status(500).json({
        success: false,
        message: error.message || '批量文档解析失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }

  /**
   * 生成产品手册
   */
  async generateManual(req, res) {
    try {
      const { parsedData, options = {} } = req.body

      if (!parsedData) {
        return res.status(400).json({
          success: false,
          message: '缺少解析数据'
        })
      }

      logger.info('开始生成产品手册')

      // 生成产品手册
      const document = await DocumentGeneratorService.generateProductManual(parsedData, {
        productType: options.productType,
        language: options.language || 'en',
        detailLevel: options.detailLevel || 'standard',
        includeSections: options.includeSections
      })

      res.json({
        success: true,
        message: '产品手册生成成功',
        data: {
          document: document,
          generationStats: DocumentGeneratorService.getGenerationStats()
        }
      })

    } catch (error) {
      logger.error('产品手册生成失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '产品手册生成失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }

  /**
   * 完整的文档生成流程（上传 + 解析 + 生成）
   */
  async generateFromUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传文件'
        })
      }

      const { originalname, path: filePath } = req.file
      const options = req.body.options ? JSON.parse(req.body.options) : {}

      logger.info(`开始完整文档生成流程: ${originalname}`)

      // 1. 解析文档
      logger.info('步骤 1: 解析上传文档')
      const parsedData = await DocumentParserService.parseDocument(filePath, originalname)

      // 2. 生成产品手册
      logger.info('步骤 2: 生成产品手册')
      const document = await DocumentGeneratorService.generateProductManual(parsedData, {
        productType: options.productType,
        language: options.language || 'en',
        detailLevel: options.detailLevel || 'standard',
        includeSections: options.includeSections
      })

      // 清理上传的临时文件
      try {
        await fs.unlink(filePath)
      } catch (error) {
        logger.warn('清理临时文件失败:', error)
      }

      res.json({
        success: true,
        message: '文档生成完成',
        data: {
          sourceFile: originalname,
          parsedData: parsedData,
          document: document,
          processingTime: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('完整文档生成流程失败:', error)
      
      // 清理上传的临时文件
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path)
        } catch (cleanupError) {
          logger.warn('清理临时文件失败:', cleanupError)
        }
      }

      res.status(500).json({
        success: false,
        message: error.message || '文档生成失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }

  /**
   * 获取可用的文档模板
   */
  async getTemplates(req, res) {
    try {
      const templates = DocumentGeneratorService.getAvailableTemplates()
      
      res.json({
        success: true,
        data: {
          templates: templates,
          count: templates.length
        }
      })

    } catch (error) {
      logger.error('获取模板列表失败:', error)
      res.status(500).json({
        success: false,
        message: '获取模板列表失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }

  /**
   * 获取支持的文件格式
   */
  async getSupportedFormats(req, res) {
    try {
      const formats = DocumentParserService.getSupportedFormats()
      const limits = DocumentParserService.getFileSizeLimits()
      
      res.json({
        success: true,
        data: {
          supportedFormats: formats,
          fileSizeLimits: limits
        }
      })

    } catch (error) {
      logger.error('获取支持格式失败:', error)
      res.status(500).json({
        success: false,
        message: '获取支持格式失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }

  /**
   * 识别产品类型
   */
  async identifyProductType(req, res) {
    try {
      const { parsedData } = req.body

      if (!parsedData) {
        return res.status(400).json({
          success: false,
          message: '缺少解析数据'
        })
      }

      const productType = await DocumentGeneratorService.identifyProductType(parsedData)
      
      res.json({
        success: true,
        data: {
          productType: productType,
          confidence: 0.8 // 可以添加置信度评估
        }
      })

    } catch (error) {
      logger.error('产品类型识别失败:', error)
      res.status(500).json({
        success: false,
        message: '产品类型识别失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }

  /**
   * 预览生成的文档
   */
  async previewDocument(req, res) {
    try {
      const { document } = req.body

      if (!document) {
        return res.status(400).json({
          success: false,
          message: '缺少文档数据'
        })
      }

      // 返回HTML预览
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.send(document.html)

    } catch (error) {
      logger.error('文档预览失败:', error)
      res.status(500).json({
        success: false,
        message: '文档预览失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }

  /**
   * 导出文档
   */
  async exportDocument(req, res) {
    try {
      const { document, format = 'html' } = req.body

      if (!document) {
        return res.status(400).json({
          success: false,
          message: '缺少文档数据'
        })
      }

      const filename = `${document.metadata.title.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`

      switch (format.toLowerCase()) {
        case 'html':
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
          res.send(document.html)
          break

        case 'json':
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
          res.json(document)
          break

        default:
          return res.status(400).json({
            success: false,
            message: `不支持的导出格式: ${format}`
          })
      }

    } catch (error) {
      logger.error('文档导出失败:', error)
      res.status(500).json({
        success: false,
        message: '文档导出失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }

  /**
   * 获取文档生成统计信息
   */
  async getStats(req, res) {
    try {
      const parserStats = {
        supportedFormats: DocumentParserService.getSupportedFormats(),
        fileSizeLimits: DocumentParserService.getFileSizeLimits()
      }

      const generatorStats = DocumentGeneratorService.getGenerationStats()

      res.json({
        success: true,
        data: {
          parser: parserStats,
          generator: generatorStats,
          system: {
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
          }
        }
      })

    } catch (error) {
      logger.error('获取统计信息失败:', error)
      res.status(500).json({
        success: false,
        message: '获取统计信息失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}

module.exports = new DocumentController()
