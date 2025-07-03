const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs').promises
const path = require('path')
const logger = require('../utils/logger')
const AITranslationService = require('./AITranslationService')

class DocumentGeneratorService {
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
    }

    // 文档模板配置
    this.documentTemplates = {
      pxi_module: {
        name: 'PXI Module Product Manual',
        sections: [
          {
            id: 'overview',
            title: 'Product Overview',
            required: true,
            generator: 'generateOverview'
          },
          {
            id: 'features',
            title: 'Key Features',
            required: true,
            generator: 'generateFeatures'
          },
          {
            id: 'specifications',
            title: 'Technical Specifications',
            required: true,
            generator: 'generateSpecifications'
          },
          {
            id: 'pinout',
            title: 'Pin Configuration',
            required: false,
            generator: 'generatePinout'
          },
          {
            id: 'installation',
            title: 'Installation Guide',
            required: true,
            generator: 'generateInstallation'
          },
          {
            id: 'software',
            title: 'Software Support',
            required: true,
            generator: 'generateSoftware'
          },
          {
            id: 'applications',
            title: 'Application Examples',
            required: true,
            generator: 'generateApplications'
          },
          {
            id: 'troubleshooting',
            title: 'Troubleshooting',
            required: false,
            generator: 'generateTroubleshooting'
          }
        ]
      },
      
      daq_system: {
        name: 'Data Acquisition System Manual',
        sections: [
          {
            id: 'overview',
            title: 'System Overview',
            required: true,
            generator: 'generateOverview'
          },
          {
            id: 'architecture',
            title: 'System Architecture',
            required: true,
            generator: 'generateArchitecture'
          },
          {
            id: 'specifications',
            title: 'Acquisition Specifications',
            required: true,
            generator: 'generateSpecifications'
          },
          {
            id: 'signal_conditioning',
            title: 'Signal Conditioning',
            required: true,
            generator: 'generateSignalConditioning'
          },
          {
            id: 'software_interface',
            title: 'Software Interface',
            required: true,
            generator: 'generateSoftwareInterface'
          },
          {
            id: 'calibration',
            title: 'Calibration Procedures',
            required: true,
            generator: 'generateCalibration'
          },
          {
            id: 'applications',
            title: 'Application Examples',
            required: true,
            generator: 'generateApplications'
          }
        ]
      },
      
      test_equipment: {
        name: 'Test & Measurement Equipment Manual',
        sections: [
          {
            id: 'overview',
            title: 'Equipment Overview',
            required: true,
            generator: 'generateOverview'
          },
          {
            id: 'capabilities',
            title: 'Measurement Capabilities',
            required: true,
            generator: 'generateCapabilities'
          },
          {
            id: 'specifications',
            title: 'Technical Specifications',
            required: true,
            generator: 'generateSpecifications'
          },
          {
            id: 'operation',
            title: 'Operation Guide',
            required: true,
            generator: 'generateOperation'
          },
          {
            id: 'connectivity',
            title: 'Connectivity Options',
            required: true,
            generator: 'generateConnectivity'
          },
          {
            id: 'test_procedures',
            title: 'Test Procedures',
            required: true,
            generator: 'generateTestProcedures'
          },
          {
            id: 'maintenance',
            title: 'Maintenance & Care',
            required: false,
            generator: 'generateMaintenance'
          }
        ]
      }
    }
  }

  /**
   * 识别产品类型
   */
  async identifyProductType(parsedData) {
    try {
      // 构建分析内容
      let analysisContent = ''
      
      if (parsedData.text) {
        analysisContent += parsedData.text.substring(0, 2000) // 限制长度
      }
      
      if (parsedData.technicalSpecs && Object.keys(parsedData.technicalSpecs).length > 0) {
        analysisContent += '\n\nTechnical Specifications:\n'
        Object.entries(parsedData.technicalSpecs).forEach(([key, value]) => {
          analysisContent += `${key}: ${value}\n`
        })
      }

      const prompt = `
Analyze the following technical documentation and identify the product type. 
Choose from these categories:
1. pxi_module - PXI modular instruments
2. daq_system - Data acquisition systems  
3. test_equipment - Test and measurement equipment
4. signal_conditioning - Signal conditioning modules
5. other - Other instrumentation

Content to analyze:
${analysisContent}

Based on the content, keywords, and technical specifications, determine the most appropriate product category.
Respond with only the category identifier (e.g., "pxi_module").
`

      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: 50,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: `You are an expert in electronic instrumentation and test equipment. Analyze technical documentation to categorize products accurately.\n\n${prompt}`
          }
        ]
      })

      const productType = response.content[0].text.trim().toLowerCase()
      
      // 验证返回的产品类型
      const validTypes = ['pxi_module', 'daq_system', 'test_equipment', 'signal_conditioning', 'other']
      if (validTypes.includes(productType)) {
        return productType === 'other' ? 'pxi_module' : productType // 默认使用pxi_module
      }
      
      return 'pxi_module' // 默认类型
      
    } catch (error) {
      logger.error('产品类型识别失败:', error)
      return 'pxi_module' // 默认类型
    }
  }

  /**
   * 生成完整的产品手册
   */
  async generateProductManual(parsedData, options = {}) {
    try {
      const {
        productType = null,
        templateId = null,
        language = 'en',
        detailLevel = 'standard',
        includeSections = null
      } = options

      logger.info('开始生成产品手册')

      // 1. 识别产品类型
      const identifiedType = productType || await this.identifyProductType(parsedData)
      const template = this.documentTemplates[identifiedType] || this.documentTemplates.pxi_module

      logger.info(`产品类型: ${identifiedType}, 使用模板: ${template.name}`)

      // 2. 提取和分析产品信息
      const productInfo = await this.extractProductInfo(parsedData)

      // 3. 生成各个章节
      const sections = []
      const sectionsToGenerate = includeSections || template.sections

      for (const sectionConfig of sectionsToGenerate) {
        if (includeSections && !includeSections.find(s => s.id === sectionConfig.id)) {
          continue
        }

        try {
          logger.info(`生成章节: ${sectionConfig.title}`)
          
          const sectionContent = await this[sectionConfig.generator](
            productInfo, 
            parsedData, 
            { language, detailLevel }
          )

          sections.push({
            id: sectionConfig.id,
            title: sectionConfig.title,
            content: sectionContent,
            required: sectionConfig.required
          })

        } catch (error) {
          logger.error(`章节生成失败: ${sectionConfig.title}`, error)
          
          // 对于必需章节，添加错误占位符
          if (sectionConfig.required) {
            sections.push({
              id: sectionConfig.id,
              title: sectionConfig.title,
              content: `[Error generating content for ${sectionConfig.title}]`,
              required: sectionConfig.required,
              error: error.message
            })
          }
        }
      }

      // 4. 组装最终文档
      const document = {
        metadata: {
          title: `${productInfo.productName || 'Product'} - User Manual & Datasheet`,
          productType: identifiedType,
          template: template.name,
          language: language,
          generatedAt: new Date().toISOString(),
          version: '1.0'
        },
        productInfo: productInfo,
        sections: sections,
        sourceData: {
          filename: parsedData.metadata?.filename,
          fileType: parsedData.metadata?.fileType,
          parsedAt: parsedData.metadata?.parsedAt
        }
      }

      // 5. 生成完整的HTML文档
      document.html = this.generateHTMLDocument(document)

      logger.info('产品手册生成完成')
      return document

    } catch (error) {
      logger.error('产品手册生成失败:', error)
      throw new Error(`产品手册生成失败: ${error.message}`)
    }
  }

  /**
   * 提取产品信息
   */
  async extractProductInfo(parsedData) {
    try {
      let analysisContent = parsedData.text || ''
      
      // 添加技术规格信息
      if (parsedData.technicalSpecs) {
        analysisContent += '\n\nTechnical Specifications:\n'
        Object.entries(parsedData.technicalSpecs).forEach(([key, value]) => {
          analysisContent += `${key}: ${value}\n`
        })
      }

      const prompt = `
Analyze the following technical documentation and extract key product information.
Return the information in JSON format with these fields:

{
  "productName": "Product name or model number",
  "productFamily": "Product family or series",
  "category": "Product category",
  "description": "Brief product description",
  "keyFeatures": ["feature1", "feature2", "feature3"],
  "applications": ["application1", "application2"],
  "targetMarket": "Target market or industry"
}

Content to analyze:
${analysisContent.substring(0, 3000)}

Extract accurate information from the content. If information is not available, use reasonable defaults for instrumentation products.
`

      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: 800,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: `You are an expert technical writer specializing in electronic instrumentation. Extract product information accurately from technical documentation.\n\n${prompt}`
          }
        ]
      })

      const content = response.content[0].text.trim()
      
      try {
        // 尝试解析JSON响应
        const productInfo = JSON.parse(content)
        return {
          productName: productInfo.productName || 'Instrumentation Module',
          productFamily: productInfo.productFamily || 'PXI Series',
          category: productInfo.category || 'Data Acquisition',
          description: productInfo.description || 'High-performance instrumentation module',
          keyFeatures: productInfo.keyFeatures || ['High accuracy', 'Multi-channel', 'Software compatible'],
          applications: productInfo.applications || ['Test & Measurement', 'Data Acquisition'],
          targetMarket: productInfo.targetMarket || 'Industrial & Laboratory',
          technicalSpecs: parsedData.technicalSpecs || {}
        }
      } catch (parseError) {
        logger.warn('JSON解析失败，使用默认产品信息')
        return {
          productName: 'Instrumentation Module',
          productFamily: 'PXI Series',
          category: 'Data Acquisition',
          description: 'High-performance instrumentation module for test and measurement applications',
          keyFeatures: ['High accuracy', 'Multi-channel capability', 'Software compatible'],
          applications: ['Test & Measurement', 'Data Acquisition', 'Industrial Automation'],
          targetMarket: 'Industrial & Laboratory',
          technicalSpecs: parsedData.technicalSpecs || {}
        }
      }

    } catch (error) {
      logger.error('产品信息提取失败:', error)
      throw error
    }
  }

  /**
   * 生成产品概述章节
   */
  async generateOverview(productInfo, parsedData, options = {}) {
    const prompt = `
Write a professional product overview section for the ${productInfo.productName} in English.

Product Information:
- Name: ${productInfo.productName}
- Category: ${productInfo.category}
- Description: ${productInfo.description}
- Key Features: ${productInfo.keyFeatures.join(', ')}
- Applications: ${productInfo.applications.join(', ')}

Requirements:
1. Write in professional technical English
2. Highlight the product's core value proposition
3. Mention key technical advantages
4. Include target applications
5. Keep it concise but comprehensive (200-300 words)
6. Use industry-standard terminology

Structure the content with clear paragraphs covering:
- Product introduction and purpose
- Key capabilities and features
- Target applications and markets
- Value proposition
`

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 600,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `You are a professional technical writer specializing in electronic instrumentation documentation. Write clear, accurate, and engaging product descriptions.\n\n${prompt}`
        }
      ]
    })

    return response.content[0].text.trim()
  }

  /**
   * 生成主要特性章节
   */
  async generateFeatures(productInfo, parsedData, options = {}) {
    const prompt = `
Write a comprehensive "Key Features" section for the ${productInfo.productName} in English.

Product Information:
- Features: ${productInfo.keyFeatures.join(', ')}
- Technical Specs: ${JSON.stringify(productInfo.technicalSpecs, null, 2)}

Requirements:
1. List 5-8 key features with detailed descriptions
2. Use bullet points or numbered list format
3. Include technical specifications where relevant
4. Highlight competitive advantages
5. Use professional technical language
6. Each feature should be 1-2 sentences

Focus on features like:
- Performance specifications
- Connectivity options
- Software compatibility
- Ease of use
- Reliability features
- Industry compliance
`

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `You are a technical marketing writer for instrumentation products. Create compelling feature descriptions that highlight technical benefits.\n\n${prompt}`
        }
      ]
    })

    return response.content[0].text.trim()
  }

  /**
   * 生成技术规格章节
   */
  async generateSpecifications(productInfo, parsedData, options = {}) {
    const prompt = `
Create a comprehensive "Technical Specifications" section for the ${productInfo.productName} in English.

Available Technical Data:
${JSON.stringify(productInfo.technicalSpecs, null, 2)}

Requirements:
1. Organize specifications into logical categories
2. Use proper units and formatting
3. Include typical and maximum values where applicable
4. Add test conditions for critical parameters
5. Use standard industry terminology
6. Format as tables or structured lists

Common specification categories for instrumentation:
- Input/Output Specifications
- Performance Characteristics
- Physical Characteristics
- Environmental Specifications
- Power Requirements
- Compliance & Standards

If specific data is not available, use typical values for similar instrumentation products.
`

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 1000,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: `You are a technical specifications writer for electronic instrumentation. Create accurate, well-organized specification tables.\n\n${prompt}`
        }
      ]
    })

    return response.content[0].text.trim()
  }

  /**
   * 生成安装指南章节
   */
  async generateInstallation(productInfo, parsedData, options = {}) {
    const prompt = `
Write an "Installation Guide" section for the ${productInfo.productName} in English.

Product Type: ${productInfo.category}

Requirements:
1. Provide step-by-step installation instructions
2. Include safety warnings and precautions
3. Cover hardware installation and software setup
4. Mention required tools and components
5. Include verification steps
6. Use clear, numbered steps

Structure should include:
- Safety precautions
- Required components and tools
- Hardware installation steps
- Software installation and configuration
- System verification
- Troubleshooting common installation issues

Tailor the content for ${productInfo.category} products.
`

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `You are a technical documentation specialist. Write clear, safe, and comprehensive installation procedures.\n\n${prompt}`
        }
      ]
    })

    return response.content[0].text.trim()
  }

  /**
   * 生成软件支持章节
   */
  async generateSoftware(productInfo, parsedData, options = {}) {
    const prompt = `
Create a "Software Support" section for the ${productInfo.productName} in English.

Product Information:
- Product: ${productInfo.productName}
- Category: ${productInfo.category}

Requirements:
1. List supported software platforms and drivers
2. Include programming language support
3. Mention development environments
4. Provide API and SDK information
5. Include example code snippets where appropriate
6. Cover software installation and configuration

Typical content for instrumentation products:
- Driver support (VISA, IVI, etc.)
- Programming language support (C/C++, Python, LabVIEW, etc.)
- Development environments
- Software examples and utilities
- Documentation and resources
`

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `You are a software documentation specialist for instrumentation products. Provide comprehensive software support information.\n\n${prompt}`
        }
      ]
    })

    return response.content[0].text.trim()
  }

  /**
   * 生成应用示例章节
   */
  async generateApplications(productInfo, parsedData, options = {}) {
    const prompt = `
Write an "Application Examples" section for the ${productInfo.productName} in English.

Product Information:
- Applications: ${productInfo.applications.join(', ')}
- Target Market: ${productInfo.targetMarket}
- Category: ${productInfo.category}

Requirements:
1. Provide 3-4 detailed application examples
2. Include setup descriptions and configurations
3. Explain the benefits for each application
4. Use real-world scenarios
5. Include technical considerations
6. Mention typical results or outcomes

Structure each example with:
- Application title and overview
- Setup and configuration
- Key benefits and advantages
- Typical results or performance

Focus on applications relevant to ${productInfo.category} in ${productInfo.targetMarket} markets.
`

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 1000,
      temperature: 0.4,
      messages: [
        {
          role: 'user',
          content: `You are an applications engineer writing practical examples for instrumentation products. Provide realistic, valuable application scenarios.\n\n${prompt}`
        }
      ]
    })

    return response.content[0].text.trim()
  }

  /**
   * 生成故障排除章节
   */
  async generateTroubleshooting(productInfo, parsedData, options = {}) {
    const prompt = `
Create a "Troubleshooting" section for the ${productInfo.productName} in English.

Product Type: ${productInfo.category}

Requirements:
1. List common issues and their solutions
2. Organize by problem categories
3. Include diagnostic steps
4. Provide clear resolution procedures
5. Add contact information for technical support
6. Use problem-solution format

Common troubleshooting categories:
- Installation issues
- Communication problems
- Performance issues
- Software-related problems
- Hardware malfunctions
- Environmental factors

Structure each issue as:
- Problem description
- Possible causes
- Step-by-step solution
- Prevention tips
`

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `You are a technical support specialist. Create helpful troubleshooting guides that solve real problems efficiently.\n\n${prompt}`
        }
      ]
    })

    return response.content[0].text.trim()
  }

  /**
   * 生成HTML文档
   */
  generateHTMLDocument(document) {
    const { metadata, productInfo, sections } = document

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata.title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #0066cc;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #0066cc;
            margin: 0;
            font-size: 2.5em;
        }
        .header .subtitle {
            color: #666;
            font-size: 1.2em;
            margin-top: 10px;
        }
        .product-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #0066cc;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
            font-size: 1.8em;
        }
        .section-content {
            margin-top: 20px;
            text-align: justify;
        }
        .specs-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .specs-table th,
        .specs-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .specs-table th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #666;
            font-size: 0.9em;
        }
        ul, ol {
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
        .note {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${productInfo.productName}</h1>
        <div class="subtitle">User Manual & Datasheet</div>
        <div class="subtitle">${productInfo.category} | ${productInfo.productFamily}</div>
    </div>

    <div class="product-info">
        <h3>Product Information</h3>
        <p><strong>Product Name:</strong> ${productInfo.productName}</p>
        <p><strong>Category:</strong> ${productInfo.category}</p>
        <p><strong>Description:</strong> ${productInfo.description}</p>
        <p><strong>Target Market:</strong> ${productInfo.targetMarket}</p>
    </div>
`

    // 添加各个章节
    sections.forEach(section => {
      html += `
    <div class="section">
        <h2>${section.title}</h2>
        <div class="section-content">
            ${this.formatSectionContent(section.content)}
        </div>
    </div>
`
    })

    html += `
    <div class="footer">
        <p>Generated by Jianyi Technology Document Generation System</p>
        <p>Generated on: ${new Date(metadata.generatedAt).toLocaleString()}</p>
        <p>© 2025 Shanghai Jianyi Technology Co., Ltd. All rights reserved.</p>
    </div>
</body>
</html>
`

    return html
  }

  /**
   * 格式化章节内容
   */
  formatSectionContent(content) {
    // 简单的Markdown到HTML转换
    return content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/^\d+\. (.+)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>')
  }

  /**
   * 获取可用的文档模板
   */
  getAvailableTemplates() {
    return Object.keys(this.documentTemplates).map(key => ({
      id: key,
      name: this.documentTemplates[key].name,
      sections: this.documentTemplates[key].sections.map(s => ({
        id: s.id,
        title: s.title,
        required: s.required
      }))
    }))
  }

  /**
   * 获取生成统计信息
   */
  getGenerationStats() {
    return {
      availableTemplates: Object.keys(this.documentTemplates).length,
      supportedLanguages: ['en', 'zh'],
      model: this.config.model,
      maxTokens: this.config.maxTokens
    }
  }
}

module.exports = new DocumentGeneratorService()
