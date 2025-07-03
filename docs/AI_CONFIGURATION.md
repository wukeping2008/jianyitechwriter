# AI翻译引擎配置指南

## 概述

简仪科技翻译系统的AI翻译引擎基于OpenAI GPT-4模型，结合专业术语库和领域知识，为PXI模块仪器、数据采集和测试测量领域提供高质量的技术文档翻译服务。

## 配置步骤

### 1. 获取OpenAI API密钥

#### 1.1 注册OpenAI账户
1. 访问 [OpenAI官网](https://platform.openai.com/)
2. 注册账户并完成验证
3. 添加付费方式（API调用需要付费）

#### 1.2 创建API密钥
1. 登录OpenAI控制台
2. 进入 "API Keys" 页面
3. 点击 "Create new secret key"
4. 复制生成的API密钥（格式：sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx）

### 2. 环境变量配置

编辑 `backend/.env` 文件，配置以下参数：

```bash
# OpenAI配置
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3

# 翻译服务配置
TRANSLATION_TIMEOUT=30000
MAX_TRANSLATION_LENGTH=10000
TERMINOLOGY_CACHE_TTL=3600

# 专业术语库配置
TERMINOLOGY_UPDATE_INTERVAL=24h
AUTO_TERMINOLOGY_DETECTION=true
TERMINOLOGY_CONFIDENCE_THRESHOLD=0.8
```

### 3. 配置参数说明

#### 3.1 OpenAI模型配置

| 参数 | 说明 | 推荐值 | 备注 |
|------|------|--------|------|
| `OPENAI_API_KEY` | OpenAI API密钥 | sk-xxx... | 必须配置 |
| `OPENAI_MODEL` | 使用的模型 | gpt-4 | 推荐gpt-4获得最佳质量 |
| `OPENAI_MAX_TOKENS` | 最大token数 | 4000 | 根据需要调整 |
| `OPENAI_TEMPERATURE` | 创造性参数 | 0.3 | 0.1-0.5，越低越保守 |

#### 3.2 翻译质量配置

```bash
# 翻译质量等级
TRANSLATION_QUALITY=balanced  # fast | balanced | accurate

# 质量等级说明：
# fast: 快速翻译，适合大批量文档
# balanced: 平衡质量和速度（推荐）
# accurate: 最高质量，适合重要文档
```

#### 3.3 专业术语配置

```bash
# 术语库设置
TERMINOLOGY_STRICT_MODE=true        # 严格术语模式
TERMINOLOGY_AUTO_LEARN=true         # 自动学习新术语
TERMINOLOGY_CONFIDENCE_MIN=0.7      # 最低置信度阈值
```

### 4. 专业术语库配置

#### 4.1 术语库文件位置
```
terminology/
├── pxi-terminology.json          # PXI领域术语
├── daq-terminology.json          # 数据采集术语
├── test-terminology.json         # 测试测量术语
└── custom-terminology.json       # 自定义术语
```

#### 4.2 术语库格式
```json
{
  "metadata": {
    "name": "PXI模块仪器专业术语库",
    "version": "1.0.0",
    "domain": "instrumentation"
  },
  "terms": [
    {
      "id": "pxi_001",
      "sourceText": "PXI Module",
      "targetText": "PXI模块",
      "category": "hardware",
      "domain": "pxi",
      "confidence": 0.99,
      "verified": true,
      "synonyms": ["PXI Card", "PXI Instrument"],
      "context": ["module configuration", "installation"],
      "notes": "PXI标准模块化仪器"
    }
  ]
}
```

#### 4.3 添加自定义术语
```javascript
// 通过API添加术语
POST /api/terminology/add
{
  "sourceText": "Signal Generator",
  "targetText": "信号发生器",
  "category": "hardware",
  "domain": "signal",
  "notes": "用于产生各种波形信号的仪器"
}
```

### 5. 翻译模式配置

#### 5.1 文档类型配置
```javascript
const documentTypes = {
  'user-manual': {
    temperature: 0.2,
    preserveFormatting: true,
    domain: 'general'
  },
  'technical-spec': {
    temperature: 0.1,
    preserveFormatting: true,
    domain: 'specification'
  },
  'api-documentation': {
    temperature: 0.15,
    preserveFormatting: true,
    domain: 'software'
  }
}
```

#### 5.2 领域特定配置
```javascript
const domainConfigs = {
  'pxi': {
    terminologyWeight: 0.9,
    contextWindow: 2000,
    specialInstructions: 'PXI术语保持英文缩写'
  },
  'daq': {
    terminologyWeight: 0.85,
    contextWindow: 1500,
    specialInstructions: '数据采集参数保持精确'
  },
  'test': {
    terminologyWeight: 0.8,
    contextWindow: 1800,
    specialInstructions: '测试流程描述要清晰'
  }
}
```

### 6. 性能优化配置

#### 6.1 批量处理配置
```bash
# 批量翻译设置
BATCH_SIZE=5                    # 每批处理数量
BATCH_DELAY=1000               # 批次间延迟(ms)
MAX_CONCURRENT_REQUESTS=3       # 最大并发请求
```

#### 6.2 缓存配置
```bash
# Redis缓存设置
REDIS_URL=redis://localhost:6379
TRANSLATION_CACHE_TTL=86400     # 翻译结果缓存时间(秒)
TERMINOLOGY_CACHE_TTL=3600      # 术语缓存时间(秒)
```

#### 6.3 速率限制配置
```bash
# API速率限制
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_TOKENS_PER_MINUTE=40000
RATE_LIMIT_BURST_SIZE=10
```

### 7. 质量控制配置

#### 7.1 质量评估参数
```javascript
const qualityMetrics = {
  terminologyAccuracy: 0.3,      // 术语准确性权重
  formatPreservation: 0.2,       // 格式保持权重
  fluency: 0.3,                  // 流畅度权重
  completeness: 0.2              // 完整性权重
}
```

#### 7.2 自动质量检查
```bash
# 质量检查设置
ENABLE_QUALITY_CHECK=true
MIN_QUALITY_SCORE=0.7
AUTO_RETRY_LOW_QUALITY=true
MAX_RETRY_ATTEMPTS=2
```

### 8. 监控和日志配置

#### 8.1 翻译监控
```bash
# 监控设置
ENABLE_TRANSLATION_METRICS=true
METRICS_RETENTION_DAYS=30
ALERT_ON_HIGH_ERROR_RATE=true
ERROR_RATE_THRESHOLD=0.1
```

#### 8.2 日志配置
```bash
# 日志设置
LOG_TRANSLATION_REQUESTS=true
LOG_TERMINOLOGY_USAGE=true
LOG_QUALITY_SCORES=true
LOG_PERFORMANCE_METRICS=true
```

### 9. 安全配置

#### 9.1 API密钥安全
```bash
# 密钥轮换
OPENAI_KEY_ROTATION_DAYS=90
BACKUP_API_KEYS=sk-backup1,sk-backup2

# 访问控制
RESTRICT_API_ACCESS=true
ALLOWED_IPS=192.168.1.0/24,10.0.0.0/8
```

#### 9.2 数据安全
```bash
# 数据保护
ENCRYPT_TRANSLATION_DATA=true
DATA_RETENTION_DAYS=365
AUTO_DELETE_SENSITIVE_DATA=true
```

### 10. 测试配置

#### 10.1 测试环境配置
```bash
# 测试设置
NODE_ENV=test
OPENAI_API_KEY=sk-test-key
USE_MOCK_RESPONSES=true
TEST_TERMINOLOGY_FILE=test-terminology.json
```

#### 10.2 性能测试
```javascript
// 性能测试配置
const performanceTests = {
  singleTranslation: {
    maxResponseTime: 5000,      // 5秒
    minQualityScore: 0.8
  },
  batchTranslation: {
    maxResponseTime: 30000,     // 30秒
    minThroughput: 100          // 100字符/秒
  }
}
```

## 使用示例

### 1. 基本翻译调用
```javascript
const AITranslationService = require('./services/AITranslationService')

// 翻译单个文本
const result = await AITranslationService.translateText(
  'PXI Module configuration and installation guide',
  {
    sourceLanguage: 'en',
    targetLanguage: 'zh',
    domain: 'pxi',
    documentType: 'user-manual'
  }
)

console.log(result.translatedText)
// 输出: "PXI模块配置和安装指南"
```

### 2. 批量翻译
```javascript
const texts = [
  'Data Acquisition System',
  'Signal Conditioning Module',
  'Test Measurement Equipment'
]

const results = await AITranslationService.translateBatch(texts, {
  sourceLanguage: 'en',
  targetLanguage: 'zh',
  domain: 'instrumentation'
})
```

### 3. 文档翻译
```javascript
const paragraphs = [
  { text: 'Introduction to PXI', type: 'heading' },
  { text: 'PXI modules provide...', type: 'paragraph' },
  { text: 'Technical specifications', type: 'heading' }
]

const result = await AITranslationService.translateDocument(paragraphs, {
  sourceLanguage: 'en',
  targetLanguage: 'zh',
  domain: 'pxi',
  onProgress: (progress) => console.log(`进度: ${progress}%`)
})
```

## 故障排除

### 1. 常见错误

#### API密钥错误
```
错误: Invalid API key
解决: 检查OPENAI_API_KEY是否正确配置
```

#### 配额超限
```
错误: Rate limit exceeded
解决: 降低BATCH_SIZE或增加BATCH_DELAY
```

#### 术语库加载失败
```
错误: Failed to load terminology
解决: 检查terminology/目录下的JSON文件格式
```

### 2. 性能优化建议

1. **合理设置批量大小**: 根据API限制调整BATCH_SIZE
2. **启用缓存**: 配置Redis缓存减少重复翻译
3. **优化术语库**: 定期清理低频术语
4. **监控质量**: 设置质量阈值自动重试

### 3. 质量提升建议

1. **完善术语库**: 持续添加专业术语
2. **调整温度参数**: 根据文档类型优化temperature
3. **使用上下文**: 提供更多上下文信息
4. **人工审核**: 对重要文档进行人工审核

## 最佳实践

### 1. 术语管理
- 定期更新术语库
- 验证术语翻译准确性
- 建立术语审核流程

### 2. 质量控制
- 设置合理的质量阈值
- 实施多层质量检查
- 收集用户反馈

### 3. 性能监控
- 监控API使用量
- 跟踪翻译质量趋势
- 优化响应时间

### 4. 安全管理
- 定期轮换API密钥
- 加密敏感数据
- 限制访问权限

---

**注意**: 请确保OpenAI API密钥的安全，不要在代码中硬编码或提交到版本控制系统。

*Copyright © 2025 简仪科技. All rights reserved.*
