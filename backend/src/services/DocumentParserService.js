const fs = require('fs').promises
const path = require('path')
const xlsx = require('xlsx')
const mammoth = require('mammoth')
const pdfParse = require('pdf-parse')
const sharp = require('sharp')
const Tesseract = require('tesseract.js')
const logger = require('../utils/logger')

class DocumentParserService {
  constructor() {
    // 支持的文件格式配置
    this.supportedFormats = {
      excel: ['.xlsx', '.xls'],
      pdf: ['.pdf'],
      word: ['.docx', '.doc'],
      text: ['.txt', '.md'],
      image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
    }

    // 文件大小限制 (字节)
    this.fileSizeLimits = {
      excel: 50 * 1024 * 1024,    // 50MB
      pdf: 100 * 1024 * 1024,    // 100MB
      word: 50 * 1024 * 1024,    // 50MB
      text: 10 * 1024 * 1024,    // 10MB
      image: 20 * 1024 * 1024    // 20MB
    }
  }

  /**
   * 检测文件类型
   */
  detectFileType(filename) {
    const ext = path.extname(filename).toLowerCase()
    
    for (const [type, extensions] of Object.entries(this.supportedFormats)) {
      if (extensions.includes(ext)) {
        return type
      }
    }
    
    throw new Error(`不支持的文件格式: ${ext}`)
  }

  /**
   * 验证文件大小
   */
  async validateFileSize(filePath, fileType) {
    const stats = await fs.stat(filePath)
    const fileSize = stats.size
    const limit = this.fileSizeLimits[fileType]
    
    if (fileSize > limit) {
      throw new Error(`文件大小超过限制: ${Math.round(fileSize / 1024 / 1024)}MB > ${Math.round(limit / 1024 / 1024)}MB`)
    }
    
    return fileSize
  }

  /**
   * 解析文档
   */
  async parseDocument(filePath, filename = null) {
    try {
      // 如果没有提供filename，从filePath中提取
      const actualFilename = filename || path.basename(filePath)
      const fileType = this.detectFileType(actualFilename)
      await this.validateFileSize(filePath, fileType)
      
      logger.info(`开始解析文档: ${actualFilename}, 类型: ${fileType}`)
      
      let result
      switch (fileType) {
        case 'excel':
          result = await this.parseExcel(filePath)
          break
        case 'pdf':
          result = await this.parsePDF(filePath)
          break
        case 'word':
          result = await this.parseWord(filePath)
          break
        case 'text':
          result = await this.parseText(filePath)
          break
        case 'image':
          result = await this.parseImage(filePath)
          break
        default:
          throw new Error(`不支持的文件类型: ${fileType}`)
      }
      
      // 添加元数据
      result.metadata = {
        filename: actualFilename,
        fileType: fileType,
        fileSize: await this.validateFileSize(filePath, fileType),
        parsedAt: new Date().toISOString()
      }
      
      logger.info(`文档解析完成: ${actualFilename}`)
      return result
      
    } catch (error) {
      logger.error(`文档解析失败: ${filename}`, error)
      throw error
    }
  }

  /**
   * 解析Excel文件
   */
  async parseExcel(filePath) {
    try {
      const workbook = xlsx.readFile(filePath)
      const result = {
        type: 'excel',
        sheets: [],
        tables: [],
        text: ''
      }
      
      // 遍历所有工作表
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName]
        
        // 转换为JSON格式
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 })
        
        // 提取表格数据
        const tableData = this.extractTableFromArray(jsonData)
        
        // 转换为文本
        const textData = xlsx.utils.sheet_to_txt(worksheet)
        
        result.sheets.push({
          name: sheetName,
          data: jsonData,
          text: textData,
          rowCount: jsonData.length,
          colCount: jsonData[0] ? jsonData[0].length : 0
        })
        
        if (tableData.length > 0) {
          result.tables.push({
            sheetName: sheetName,
            data: tableData,
            headers: tableData[0] || [],
            rows: tableData.slice(1) || []
          })
        }
        
        result.text += textData + '\n'
      })
      
      // 识别技术参数表格
      result.technicalSpecs = this.extractTechnicalSpecs(result.tables)
      
      return result
      
    } catch (error) {
      throw new Error(`Excel解析失败: ${error.message}`)
    }
  }

  /**
   * 解析PDF文件
   */
  async parsePDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath)
      const pdfData = await pdfParse(dataBuffer)
      
      const result = {
        type: 'pdf',
        text: pdfData.text,
        pages: pdfData.numpages,
        info: pdfData.info,
        metadata: pdfData.metadata,
        sections: [],
        tables: [],
        technicalSpecs: {}
      }
      
      // 分析文档结构
      result.sections = this.extractSections(pdfData.text)
      
      // 提取表格数据（简单的基于文本的表格识别）
      result.tables = this.extractTablesFromText(pdfData.text)
      
      // 识别技术参数
      result.technicalSpecs = this.extractTechnicalSpecsFromText(pdfData.text)
      
      return result
      
    } catch (error) {
      throw new Error(`PDF解析失败: ${error.message}`)
    }
  }

  /**
   * 解析Word文档
   */
  async parseWord(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath })
      const htmlResult = await mammoth.convertToHtml({ path: filePath })
      
      const parsedResult = {
        type: 'word',
        text: result.value,
        html: htmlResult.value,
        messages: [...result.messages, ...htmlResult.messages],
        sections: [],
        tables: [],
        technicalSpecs: {}
      }
      
      // 分析文档结构
      parsedResult.sections = this.extractSections(result.value)
      
      // 从HTML中提取表格
      parsedResult.tables = this.extractTablesFromHTML(htmlResult.value)
      
      // 识别技术参数
      parsedResult.technicalSpecs = this.extractTechnicalSpecsFromText(result.value)
      
      return parsedResult
      
    } catch (error) {
      throw new Error(`Word文档解析失败: ${error.message}`)
    }
  }

  /**
   * 解析文本文件
   */
  async parseText(filePath) {
    try {
      const text = await fs.readFile(filePath, 'utf8')
      
      const result = {
        type: 'text',
        text: text,
        sections: [],
        tables: [],
        technicalSpecs: {}
      }
      
      // 分析文档结构
      result.sections = this.extractSections(text)
      
      // 提取表格数据
      result.tables = this.extractTablesFromText(text)
      
      // 识别技术参数
      result.technicalSpecs = this.extractTechnicalSpecsFromText(text)
      
      return result
      
    } catch (error) {
      throw new Error(`文本文件解析失败: ${error.message}`)
    }
  }

  /**
   * 解析图片文件 (OCR)
   */
  async parseImage(filePath) {
    try {
      // 使用sharp优化图片
      const optimizedImagePath = filePath + '_optimized.png'
      await sharp(filePath)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .greyscale()
        .normalize()
        .png()
        .toFile(optimizedImagePath)
      
      // 使用Tesseract进行OCR
      const { data: { text } } = await Tesseract.recognize(optimizedImagePath, 'chi_sim+eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            logger.info(`OCR进度: ${Math.round(m.progress * 100)}%`)
          }
        }
      })
      
      // 清理临时文件
      try {
        await fs.unlink(optimizedImagePath)
      } catch (e) {
        // 忽略清理错误
      }
      
      const result = {
        type: 'image',
        text: text,
        sections: [],
        tables: [],
        technicalSpecs: {}
      }
      
      if (text.trim()) {
        // 分析OCR提取的文本
        result.sections = this.extractSections(text)
        result.tables = this.extractTablesFromText(text)
        result.technicalSpecs = this.extractTechnicalSpecsFromText(text)
      }
      
      return result
      
    } catch (error) {
      throw new Error(`图片OCR解析失败: ${error.message}`)
    }
  }

  /**
   * 从数组中提取表格数据
   */
  extractTableFromArray(data) {
    if (!data || data.length === 0) return []
    
    // 过滤空行
    return data.filter(row => 
      row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    )
  }

  /**
   * 从文本中提取章节
   */
  extractSections(text) {
    const sections = []
    const lines = text.split('\n')
    
    let currentSection = null
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      // 识别标题（简单的启发式规则）
      if (this.isHeading(trimmedLine)) {
        if (currentSection) {
          sections.push(currentSection)
        }
        
        currentSection = {
          title: trimmedLine,
          content: '',
          startLine: index,
          level: this.getHeadingLevel(trimmedLine)
        }
      } else if (currentSection && trimmedLine) {
        currentSection.content += trimmedLine + '\n'
      }
    })
    
    if (currentSection) {
      sections.push(currentSection)
    }
    
    return sections
  }

  /**
   * 判断是否为标题
   */
  isHeading(line) {
    // 检查常见的标题模式
    const headingPatterns = [
      /^#+\s+/,                    // Markdown标题
      /^\d+\.?\s+[A-Z]/,          // 数字编号标题
      /^[A-Z][^a-z]*$/,           // 全大写标题
      /^第[一二三四五六七八九十\d]+[章节部分]/,  // 中文章节
      /^Chapter\s+\d+/i,          // 英文章节
      /^Section\s+\d+/i,          // 英文节
      /^附录[A-Z\d]/,             // 附录
      /^Appendix\s+[A-Z]/i        // 英文附录
    ]
    
    return headingPatterns.some(pattern => pattern.test(line)) && line.length < 100
  }

  /**
   * 获取标题级别
   */
  getHeadingLevel(line) {
    if (line.startsWith('###')) return 3
    if (line.startsWith('##')) return 2
    if (line.startsWith('#')) return 1
    if (/^\d+\./.test(line)) return 1
    if (/^\d+\.\d+/.test(line)) return 2
    if (/^\d+\.\d+\.\d+/.test(line)) return 3
    return 1
  }

  /**
   * 从文本中提取表格
   */
  extractTablesFromText(text) {
    const tables = []
    const lines = text.split('\n')
    
    let currentTable = null
    
    lines.forEach(line => {
      const trimmedLine = line.trim()
      
      // 检测表格行（包含多个分隔符）
      if (this.isTableRow(trimmedLine)) {
        const cells = this.parseTableRow(trimmedLine)
        
        if (!currentTable) {
          currentTable = {
            headers: cells,
            rows: []
          }
        } else {
          currentTable.rows.push(cells)
        }
      } else if (currentTable && currentTable.rows.length > 0) {
        // 表格结束
        tables.push(currentTable)
        currentTable = null
      }
    })
    
    if (currentTable && currentTable.rows.length > 0) {
      tables.push(currentTable)
    }
    
    return tables
  }

  /**
   * 判断是否为表格行
   */
  isTableRow(line) {
    // 检查是否包含表格分隔符
    const separators = ['|', '\t', '  ']
    return separators.some(sep => {
      const parts = line.split(sep)
      return parts.length >= 2 && parts.some(part => part.trim().length > 0)
    })
  }

  /**
   * 解析表格行
   */
  parseTableRow(line) {
    // 尝试不同的分隔符
    const separators = ['|', '\t']
    
    for (const sep of separators) {
      if (line.includes(sep)) {
        return line.split(sep)
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0)
      }
    }
    
    // 使用空格分隔（多个空格作为分隔符）
    return line.split(/\s{2,}/)
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0)
  }

  /**
   * 从HTML中提取表格
   */
  extractTablesFromHTML(html) {
    const tables = []
    
    // 简单的HTML表格提取（可以使用更复杂的HTML解析器）
    const tableRegex = /<table[^>]*>(.*?)<\/table>/gis
    let match
    
    while ((match = tableRegex.exec(html)) !== null) {
      const tableHTML = match[1]
      const table = this.parseHTMLTable(tableHTML)
      if (table) {
        tables.push(table)
      }
    }
    
    return tables
  }

  /**
   * 解析HTML表格
   */
  parseHTMLTable(tableHTML) {
    const rows = []
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis
    let rowMatch
    
    while ((rowMatch = rowRegex.exec(tableHTML)) !== null) {
      const rowHTML = rowMatch[1]
      const cells = []
      const cellRegex = /<t[hd][^>]*>(.*?)<\/t[hd]>/gis
      let cellMatch
      
      while ((cellMatch = cellRegex.exec(rowHTML)) !== null) {
        const cellText = cellMatch[1].replace(/<[^>]*>/g, '').trim()
        cells.push(cellText)
      }
      
      if (cells.length > 0) {
        rows.push(cells)
      }
    }
    
    if (rows.length === 0) return null
    
    return {
      headers: rows[0],
      rows: rows.slice(1)
    }
  }

  /**
   * 从表格中提取技术规格
   */
  extractTechnicalSpecs(tables) {
    const specs = {}
    
    tables.forEach(table => {
      if (table.headers && table.rows) {
        table.rows.forEach(row => {
          if (row.length >= 2) {
            const key = row[0]
            const value = row[1]
            
            // 识别技术参数
            if (this.isTechnicalParameter(key)) {
              specs[key] = value
            }
          }
        })
      }
    })
    
    return specs
  }

  /**
   * 从文本中提取技术规格
   */
  extractTechnicalSpecsFromText(text) {
    const specs = {}
    const lines = text.split('\n')
    
    lines.forEach(line => {
      const trimmedLine = line.trim()
      
      // 查找参数模式：参数名: 值 或 参数名 = 值
      const patterns = [
        /^([^:：]+)[：:]\s*(.+)$/,
        /^([^=]+)=\s*(.+)$/,
        /^([^-]+)-\s*(.+)$/
      ]
      
      patterns.forEach(pattern => {
        const match = trimmedLine.match(pattern)
        if (match) {
          const key = match[1].trim()
          const value = match[2].trim()
          
          if (this.isTechnicalParameter(key) && value) {
            specs[key] = value
          }
        }
      })
    })
    
    return specs
  }

  /**
   * 判断是否为技术参数
   */
  isTechnicalParameter(key) {
    const technicalKeywords = [
      // 通用参数
      'voltage', 'current', 'power', 'frequency', 'resolution', 'accuracy',
      'range', 'bandwidth', 'impedance', 'gain', 'offset', 'noise',
      'temperature', 'humidity', 'pressure', 'speed', 'rate',
      
      // 中文参数
      '电压', '电流', '功率', '频率', '分辨率', '精度', '准确度',
      '范围', '带宽', '阻抗', '增益', '偏移', '噪声',
      '温度', '湿度', '压力', '速度', '速率', '采样率',
      
      // PXI/DAQ特定参数
      'channels', 'sampling', 'input', 'output', 'digital', 'analog',
      'trigger', 'clock', 'sync', 'isolation', 'coupling',
      
      // 中文PXI/DAQ参数
      '通道', '采样', '输入', '输出', '数字', '模拟',
      '触发', '时钟', '同步', '隔离', '耦合', '模块'
    ]
    
    const keyLower = key.toLowerCase()
    return technicalKeywords.some(keyword => 
      keyLower.includes(keyword.toLowerCase())
    )
  }

  /**
   * 批量解析文档
   */
  async parseMultipleDocuments(filePaths) {
    const results = []
    
    for (const filePath of filePaths) {
      try {
        const filename = path.basename(filePath)
        const result = await this.parseDocument(filePath, filename)
        results.push({
          success: true,
          filename: filename,
          data: result
        })
      } catch (error) {
        results.push({
          success: false,
          filename: path.basename(filePath),
          error: error.message
        })
      }
    }
    
    return results
  }

  /**
   * 获取支持的文件格式列表（用于测试）
   */
  getSupportedFormats() {
    const formats = []
    for (const [type, extensions] of Object.entries(this.supportedFormats)) {
      extensions.forEach(ext => {
        formats.push({
          type: type,
          extension: ext,
          maxSize: this.fileSizeLimits[type]
        })
      })
    }
    return formats
  }

  /**
   * 获取文件大小限制
   */
  getFileSizeLimits() {
    return this.fileSizeLimits
  }

  /**
   * 验证文件类型是否支持
   */
  isValidFileType(filename) {
    try {
      this.detectFileType(filename)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 获取最大文件大小
   */
  getMaxFileSize() {
    return Math.max(...Object.values(this.fileSizeLimits))
  }

  /**
   * 验证文件大小是否在限制内
   */
  isValidFileSize(size) {
    return size <= this.getMaxFileSize()
  }

  /**
   * 检查文件类型是否安全
   */
  isSafeFileType(filename) {
    const ext = path.extname(filename).toLowerCase()
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
      '.vbs', '.js', '.jar', '.app', '.deb', '.pkg',
      '.dmg', '.iso', '.msi', '.run', '.sh'
    ]
    return !dangerousExtensions.includes(ext)
  }

  /**
   * 解析Excel数据（用于测试）
   */
  parseExcelData(data) {
    const result = {
      type: 'excel',
      text: '',
      technicalSpecs: {},
      tables: []
    }

    for (const [sheetName, sheetData] of Object.entries(data)) {
      if (Array.isArray(sheetData) && sheetData.length > 0) {
        // 转换为文本
        const textLines = sheetData.map(row => 
          Array.isArray(row) ? row.join(' ') : String(row)
        )
        result.text += textLines.join('\n') + '\n'

        // 提取技术规格
        if (sheetData.length > 1) {
          const headers = sheetData[0]
          const rows = sheetData.slice(1)
          
          rows.forEach(row => {
            if (row.length >= 2) {
              const key = String(row[0]).trim()
              const value = String(row[1]).trim()
              const unit = row.length > 2 ? String(row[2]).trim() : ''
              
              if (key && value) {
                result.technicalSpecs[key] = unit ? `${value} ${unit}` : value
              }
            }
          })

          result.tables.push({
            sheetName: sheetName,
            headers: headers,
            rows: rows
          })
        }
      }
    }

    return result
  }

  /**
   * 提取技术规格（修复版本）
   */
  extractTechnicalSpecs(input) {
    const specs = {}
    
    // 如果输入是字符串，从文本中提取
    if (typeof input === 'string') {
      return this.extractTechnicalSpecsFromText(input)
    }
    
    // 如果输入是数组（表格数据）
    if (Array.isArray(input)) {
      input.forEach(table => {
        if (table.headers && table.rows) {
          table.rows.forEach(row => {
            if (row.length >= 2) {
              const key = String(row[0]).trim()
              const value = String(row[1]).trim()
              
              if (this.isTechnicalParameter(key) && value) {
                specs[key] = value
              }
            }
          })
        }
      })
    }
    
    return specs
  }

  /**
   * 提取章节（修复版本）
   */
  extractSections(text) {
    const sections = []
    const lines = text.split('\n')
    
    let currentSection = null
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      // 识别标题（包括Markdown格式）
      if (this.isHeading(trimmedLine)) {
        if (currentSection) {
          sections.push(currentSection)
        }
        
        // 清理标题文本（移除Markdown标记）
        const cleanTitle = trimmedLine.replace(/^#+\s*/, '').replace(/^##\s*/, '')
        
        currentSection = {
          title: cleanTitle || trimmedLine,
          content: '',
          startLine: index,
          level: this.getHeadingLevel(trimmedLine)
        }
      } else if (currentSection && trimmedLine) {
        currentSection.content += trimmedLine + '\n'
      }
    })
    
    if (currentSection) {
      sections.push(currentSection)
    }
    
    return sections
  }
}

module.exports = new DocumentParserService()
