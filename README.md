# 简仪科技文档制作翻译系统

一个基于AI的专业文档制作和翻译系统，专为简仪科技的产品文档需求而设计。

## 🚀 项目概述

简仪科技文档制作翻译系统是一个全栈Web应用，提供智能化的文档生成、翻译和质量控制功能。系统支持PXI模块、DAQ系统、测试设备等产品的技术文档制作，并集成了专业的术语管理和质量保证机制。

## ✨ 核心功能

### 📝 智能文档生成
- **模板化生成**: 基于预定义模板快速生成标准化文档
- **AI驱动内容**: 集成Claude AI进行智能内容生成
- **多格式支持**: 支持Markdown、HTML、DOCX、PDF等格式输出
- **变量系统**: 灵活的变量替换和验证机制

### 🌐 专业翻译服务
- **AI翻译**: 基于Claude的高质量中英文翻译
- **术语管理**: 专业术语库确保翻译一致性
- **批量处理**: 支持大规模文档批量翻译
- **质量控制**: 多维度翻译质量评估

### 🎯 质量保证系统
- **多维度检查**: 术语准确性、一致性、格式规范、完整性、准确性
- **智能评分**: 基于权重的综合质量评分
- **改进建议**: 自动生成质量改进建议
- **历史追踪**: 完整的质量检查历史记录

### 📊 高级编辑器
- **实时预览**: 所见即所得的编辑体验
- **版本控制**: 完整的文档版本管理
- **协作编辑**: 多用户实时协作功能
- **术语高亮**: 智能术语识别和高亮显示

### 🔄 批量处理
- **并发处理**: 高效的并发任务处理
- **进度监控**: 实时处理进度跟踪
- **错误处理**: 完善的错误处理和重试机制
- **结果导出**: 多格式结果导出功能

## 🛠️ 技术栈

### 前端技术
- **React 18**: 现代化的用户界面框架
- **TypeScript**: 类型安全的JavaScript超集
- **Vite**: 快速的构建工具
- **Redux Toolkit**: 状态管理
- **Ant Design**: 企业级UI组件库

### 后端技术
- **Node.js**: 高性能JavaScript运行时
- **Express.js**: 轻量级Web框架
- **JSON数据库**: 轻量级文件存储系统
- **Claude AI**: 智能内容生成和翻译
- **EventEmitter**: 事件驱动架构

### 开发工具
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Jest**: 单元测试框架
- **Docker**: 容器化部署
- **GitHub Actions**: CI/CD自动化

## 📦 项目结构

```
jianyi-tech-translator/
├── frontend/                 # React前端应用
│   ├── src/
│   │   ├── components/       # 可复用组件
│   │   ├── pages/           # 页面组件
│   │   ├── services/        # API服务
│   │   ├── store/           # Redux状态管理
│   │   └── types/           # TypeScript类型定义
│   ├── public/              # 静态资源
│   └── package.json
├── backend/                  # Node.js后端服务
│   ├── src/
│   │   ├── controllers/     # 控制器层
│   │   ├── services/        # 业务逻辑层
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # 路由定义
│   │   ├── middleware/      # 中间件
│   │   ├── config/          # 配置文件
│   │   └── utils/           # 工具函数
│   ├── tests/               # 测试文件
│   └── package.json
├── docs/                     # 项目文档
├── terminology/              # 术语库
├── scripts/                  # 部署脚本
└── docker-compose.yml        # Docker编排文件
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/wukeping2008/jianyitechwriter.git
cd jianyitechwriter
```

2. **安装依赖**
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

3. **配置环境变量**
```bash
# 复制环境变量模板
cp backend/.env.example backend/.env

# 编辑环境变量文件
# 配置Claude API密钥等必要参数
```

4. **启动开发服务器**
```bash
# 启动后端服务 (端口: 5000)
cd backend
npm run dev

# 启动前端服务 (端口: 3002)
cd frontend
npm run dev
```

5. **访问应用**
- 前端应用: http://localhost:3002
- 后端API: http://localhost:5000
- API文档: http://localhost:5000/api-docs

### 默认账户
- 用户名: admin
- 邮箱: admin@jytek.com
- 密码: admin123

## 📖 使用指南

### 文档生成流程
1. 选择合适的文档模板
2. 填写必要的变量信息
3. 预览生成的文档内容
4. 执行质量检查
5. 导出最终文档

### 翻译工作流程
1. 上传待翻译文档
2. 选择翻译选项和目标语言
3. 执行AI翻译
4. 进行质量控制检查
5. 人工审核和优化
6. 导出翻译结果

### 批量处理操作
1. 批量上传文档文件
2. 配置处理参数
3. 启动批量任务
4. 监控处理进度
5. 下载处理结果

## 🔧 配置说明

### 环境变量配置
```env
# 服务器配置
PORT=5000
HOST=localhost
NODE_ENV=development

# Claude AI配置
CLAUDE_API_KEY=your_claude_api_key
CLAUDE_MODEL=claude-3-sonnet-20240229

# 安全配置
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:3002

# 文件上传配置
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./uploads
```

### 术语库配置
术语库位于 `terminology/` 目录，支持以下格式：
- `jytek-terminology.json`: 简仪科技专业术语
- `pxi-terminology.json`: PXI相关术语

## 🧪 测试

### 运行测试
```bash
# 后端单元测试
cd backend
npm test

# 前端测试
cd frontend
npm test

# 集成测试
npm run test:integration
```

### 测试覆盖率
```bash
npm run test:coverage
```

## 📦 部署

### Docker部署
```bash
# 构建和启动服务
docker-compose up -d

# 生产环境部署
docker-compose -f docker-compose.prod.yml up -d
```

### 手动部署
```bash
# 构建前端
cd frontend
npm run build

# 启动生产服务器
cd backend
npm start
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 团队

- **开发团队**: 简仪科技研发部
- **项目负责人**: 吴科平
- **技术支持**: support@jytek.com

## 📞 联系我们

- **公司官网**: https://www.jytek.com
- **技术支持**: support@jytek.com
- **项目地址**: https://github.com/wukeping2008/jianyitechwriter

## 🔄 更新日志

### v1.0.0 (2025-01-03)
- ✨ 初始版本发布
- 🚀 完整的文档生成和翻译功能
- 🎯 质量控制系统
- 📊 高级编辑器
- 🔄 批量处理功能
- 🛠️ 轻量化JSON数据库
- 📱 响应式用户界面

---

**简仪科技** - 专业的测试测量解决方案提供商
