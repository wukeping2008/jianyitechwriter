const DocumentParserService = require('../../src/services/DocumentParserService')
const fs = require('fs')
const path = require('path')

describe('文档解析服务测试', () => {
  jest.setTimeout(30000)

  // 创建测试文件目录
  const testFilesDir = path.join(__dirname, '../test-files')
  
  beforeAll(() => {
    // 确保测试文件目录存在
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }
  })

  describe('支持的文件格式测试', () => {
    test('应该返回支持的文件格式列表', () => {
      const formats = DocumentParserService.getSupportedFormats()
      
      expect(formats).toBeDefined()
      expect(formats.length).toBeGreaterThan(0)
      
      // 检查是否包含主要格式
      const formatExtensions = formats.map(f => f.extension)
      expect(formatExtensions).toContain('.xlsx')
      expect(formatExtensions).toContain('.pdf')
      expect(formatExtensions).toContain('.docx')
      expect(formatExtensions).toContain('.txt')
      
      console.log('✅ 支持的文件格式获取成功')
      console.log('支持的格式:', formatExtensions.join(', '))
    })

    test('应该正确验证文件格式', () => {
      expect(DocumentParserService.isValidFileType('test.xlsx')).toBe(true)
      expect(DocumentParserService.isValidFileType('test.pdf')).toBe(true)
      expect(DocumentParserService.isValidFileType('test.docx')).toBe(true)
      expect(DocumentParserService.isValidFileType('test.txt')).toBe(true)
      expect(DocumentParserService.isValidFileType('test.jpg')).toBe(true)
      expect(DocumentParserService.isValidFileType('test.png')).toBe(true)
      
      // 不支持的格式
      expect(DocumentParserService.isValidFileType('test.exe')).toBe(false)
      expect(DocumentParserService.isValidFileType('test.zip')).toBe(false)
      
      console.log('✅ 文件格式验证功能正常')
    })
  })

  describe('文本文件解析测试', () => {
    test('应该能够解析文本文件', async () => {
      // 创建测试文本文件
      const testContent = `PXI-6251 Data Acquisition Module

Product Overview:
The PXI-6251 is a high-performance multifunction DAQ device featuring 16-bit resolution.

Technical Specifications:
- Resolution: 16-bit
- Channels: 16 AI, 2 AO
- Sample Rate: 1.25 MS/s
- Input Range: ±10 V
- Accuracy: ±0.05%

Applications:
- Test and measurement
- Data acquisition systems
- Industrial automation`

      const testFilePath = path.join(testFilesDir, 'test-product.txt')
      fs.writeFileSync(testFilePath, testContent, 'utf8')

      try {
        const result = await DocumentParserService.parseDocument(testFilePath)
        
        expect(result).toBeDefined()
        expect(result.type).toBe('text')
        expect(result.text).toContain('PXI-6251')
        expect(result.text).toContain('16-bit')
        expect(result.technicalSpecs).toBeDefined()
        expect(result.metadata).toBeDefined()
        expect(result.metadata.filename).toBe('test-product.txt')
        expect(result.metadata.fileType).toBe('text')
        
        console.log('✅ 文本文件解析成功')
        console.log('解析结果:', {
          type: result.type,
          textLength: result.text.length,
          specsCount: Object.keys(result.technicalSpecs).length,
          filename: result.metadata.filename
        })
        
      } catch (error) {
        console.error('❌ 文本文件解析失败:', error.message)
        throw error
      } finally {
        // 清理测试文件
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath)
        }
      }
    })
  })

  describe('Excel文件解析测试', () => {
    test('应该能够处理Excel文件格式', async () => {
      // 模拟Excel文件解析（因为创建真实Excel文件比较复杂）
      const mockExcelData = {
        'Sheet1': [
          ['Parameter', 'Value', 'Unit'],
          ['Model', 'PXI-6251', ''],
          ['Resolution', '16', 'bit'],
          ['Channels', '16', 'AI'],
          ['Sample Rate', '1.25', 'MS/s'],
          ['Input Range', '±10', 'V']
        ]
      }

      try {
        const result = DocumentParserService.parseExcelData(mockExcelData)
        
        expect(result).toBeDefined()
        expect(result.text).toContain('PXI-6251')
        expect(result.technicalSpecs).toBeDefined()
        expect(result.technicalSpecs['Resolution']).toBe('16 bit')
        expect(result.technicalSpecs['Sample Rate']).toBe('1.25 MS/s')
        
        console.log('✅ Excel数据解析成功')
        console.log('提取的技术规格:', result.technicalSpecs)
        
      } catch (error) {
        console.error('❌ Excel数据解析失败:', error.message)
        throw error
      }
    })
  })

  describe('技术规格提取测试', () => {
    test('应该能够从文本中提取技术规格', () => {
      const testText = `
Product Specifications:
Resolution: 16-bit
Channels: 16 AI, 2 AO  
Sample Rate: 1.25 MS/s
Input Range: ±10 V
Accuracy: ±0.05%
Power Consumption: 5W
Operating Temperature: 0°C to 55°C
`

      const specs = DocumentParserService.extractTechnicalSpecs(testText)
      
      expect(specs).toBeDefined()
      expect(specs['Resolution']).toBe('16-bit')
      expect(specs['Sample Rate']).toBe('1.25 MS/s')
      expect(specs['Input Range']).toBe('±10 V')
      expect(specs['Operating Temperature']).toBe('0°C to 55°C')
      
      console.log('✅ 技术规格提取成功')
      console.log('提取的规格数量:', Object.keys(specs).length)
      console.log('提取的规格:', specs)
    })

    test('应该能够处理不同的规格格式', () => {
      const testText = `
Technical Data:
• Resolution: 16 bits
• Channels: 16 analog inputs
• Max Sample Rate: 1.25 MS/s per channel
• Input Voltage Range: ±10V, ±5V, ±1V
• Accuracy: ±0.05% of reading
`

      const specs = DocumentParserService.extractTechnicalSpecs(testText)
      
      expect(specs).toBeDefined()
      expect(Object.keys(specs).length).toBeGreaterThan(0)
      
      console.log('✅ 多种格式规格提取成功')
      console.log('提取的规格:', specs)
    })
  })

  describe('文档章节识别测试', () => {
    test('应该能够识别文档章节结构', () => {
      const testText = `
# PXI-6251 Data Acquisition Module

## Product Overview
The PXI-6251 is a high-performance multifunction DAQ device.

## Technical Specifications
- Resolution: 16-bit
- Channels: 16 AI

## Features
- High accuracy
- Multi-channel capability

## Applications
- Test and measurement
- Industrial automation
`

      const sections = DocumentParserService.extractSections(testText)
      
      expect(sections).toBeDefined()
      expect(sections.length).toBeGreaterThan(0)
      
      const sectionTitles = sections.map(s => s.title)
      expect(sectionTitles).toContain('Product Overview')
      expect(sectionTitles).toContain('Technical Specifications')
      expect(sectionTitles).toContain('Features')
      expect(sectionTitles).toContain('Applications')
      
      console.log('✅ 文档章节识别成功')
      console.log('识别的章节:', sectionTitles)
    })
  })

  describe('文件大小和安全检查', () => {
    test('应该检查文件大小限制', () => {
      const maxSize = DocumentParserService.getMaxFileSize()
      expect(maxSize).toBeGreaterThan(0)
      
      // 测试文件大小验证
      expect(DocumentParserService.isValidFileSize(1024 * 1024)).toBe(true) // 1MB
      expect(DocumentParserService.isValidFileSize(maxSize + 1)).toBe(false) // 超过限制
      
      console.log('✅ 文件大小检查功能正常')
      console.log('最大文件大小:', maxSize / (1024 * 1024), 'MB')
    })

    test('应该检查文件安全性', () => {
      // 测试安全文件类型
      expect(DocumentParserService.isSafeFileType('document.pdf')).toBe(true)
      expect(DocumentParserService.isSafeFileType('data.xlsx')).toBe(true)
      expect(DocumentParserService.isSafeFileType('text.txt')).toBe(true)
      
      // 测试不安全文件类型
      expect(DocumentParserService.isSafeFileType('virus.exe')).toBe(false)
      expect(DocumentParserService.isSafeFileType('script.bat')).toBe(false)
      
      console.log('✅ 文件安全检查功能正常')
    })
  })

  describe('错误处理测试', () => {
    test('应该正确处理不存在的文件', async () => {
      const nonExistentFile = path.join(testFilesDir, 'non-existent.txt')
      
      await expect(DocumentParserService.parseDocument(nonExistentFile))
        .rejects.toThrow()
      
      console.log('✅ 不存在文件的错误处理正常')
    })

    test('应该正确处理空文件', async () => {
      const emptyFilePath = path.join(testFilesDir, 'empty.txt')
      fs.writeFileSync(emptyFilePath, '', 'utf8')
      
      try {
        const result = await DocumentParserService.parseDocument(emptyFilePath)
        expect(result.text).toBe('')
        
        console.log('✅ 空文件处理正常')
      } finally {
        if (fs.existsSync(emptyFilePath)) {
          fs.unlinkSync(emptyFilePath)
        }
      }
    })
  })

  describe('批量处理测试', () => {
    test('应该能够处理多个文件', async () => {
      // 创建多个测试文件
      const files = [
        { name: 'file1.txt', content: 'PXI Module 1\nResolution: 12-bit' },
        { name: 'file2.txt', content: 'DAQ System 2\nChannels: 8 AI' },
        { name: 'file3.txt', content: 'Test Equipment 3\nAccuracy: ±0.1%' }
      ]
      
      const filePaths = []
      
      try {
        // 创建测试文件
        for (const file of files) {
          const filePath = path.join(testFilesDir, file.name)
          fs.writeFileSync(filePath, file.content, 'utf8')
          filePaths.push(filePath)
        }
        
        // 批量解析
        const results = await DocumentParserService.parseMultipleDocuments(filePaths)
        
        expect(results).toBeDefined()
        expect(results.length).toBe(3)
        expect(results[0].data.text).toContain('PXI Module 1')
        expect(results[1].data.text).toContain('DAQ System 2')
        expect(results[2].data.text).toContain('Test Equipment 3')
        
        console.log('✅ 批量文件处理成功')
        console.log('处理的文件数量:', results.length)
        
      } finally {
        // 清理测试文件
        filePaths.forEach(filePath => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
        })
      }
    })
  })
})
