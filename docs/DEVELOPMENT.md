# 简仪科技产品手册翻译系统 - 开发指南

## 项目概述

这是一个专门为简仪科技设计的产品手册和技术文档翻译系统，支持从英文到中文的专业翻译，特别针对PXI模块仪器、数据采集和测试测量领域。

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI库**: Ant Design 5
- **状态管理**: Redux Toolkit
- **路由**: React Router 6
- **国际化**: i18next
- **文档处理**: mammoth.js (Word), pdf-parse (PDF), xlsx (Excel)

### 后端
- **运行时**: Node.js 18+
- **框架**: Express.js
- **数据库**: MongoDB
- **缓存**: Redis (可选)
- **认证**: JWT
- **文件处理**: multer, mammoth, pdf-parse, xlsx
- **AI集成**: OpenAI GPT-4
- **日志**: Winston

### 部署
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **进程管理**: PM2 (可选)

## 开发环境设置

### 前置要求

1. **Node.js**: 18.0.0 或更高版本
2. **npm**: 9.0.0 或更高版本
3. **MongoDB**: 7.0 或更高版本 (可选，可使用Docker)
4. **Redis**: 7.0 或更高版本 (可选)
5. **Git**: 最新版本

### 快速开始

1. **克隆项目**
```bash
git clone https://github.com/jianyi-tech/translator.git
cd jianyi-tech-translator
```

2. **安装依赖**
```bash
# 安装所有依赖
npm run install:all

# 或者分别安装
npm install
cd frontend && npm install
cd ../backend && npm install
```

3. **环境配置**
```bash
# 复制环境变量文件
cp backend/.env.example backend/.env

# 编辑环境变量
nano backend/.env
```

4. **启动数据库** (使用Docker)
```bash
docker-compose up -d mongodb redis
```

5. **启动开发服务器**
```bash
# 同时启动前端和后端
npm run dev

# 或者分别启动
npm run dev:frontend  # 前端: http://localhost:3000
npm run dev:backend   # 后端: http://localhost:5000
```

### 环境变量配置

#### 后端环境变量 (.env)

```bash
# 服务器配置
NODE_ENV=development
PORT=5000
HOST=localhost

# 数据库
MONGODB_URI=mongodb://localhost:27017/jianyi-translator
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4

# 文件上传
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./uploads

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 项目结构

```
jianyi-tech-translator/
├── frontend/                 # React前端应用
│   ├── src/
│   │   ├── components/       # 可复用组件
│   │   ├── pages/           # 页面组件
│   │   ├── services/        # API服务
│   │   ├── store/           # Redux状态管理
│   │   ├── types/           # TypeScript类型定义
│   │   ├── utils/           # 工具函数
│   │   └── assets/          # 静态资源
│   ├── public/              # 公共文件
│   └── package.json
├── backend/                  # Node.js后端服务
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 业务逻辑
│   │   ├── routes/          # 路由定义
│   │   ├── middleware/      # 中间件
│   │   ├── models/          # 数据模型
│   │   ├── utils/           # 工具函数
│   │   └── config/          # 配置文件
│   ├── uploads/             # 文件上传目录
│   └── package.json
├── ai-engine/               # AI翻译引擎
│   ├── models/              # AI模型文件
│   ├── services/            # AI服务
│   └── data/                # 训练数据
├── terminology/             # 专业术语库
│   ├── pxi-terminology.json
│   └── custom-terms.json
├── docs/                    # 项目文档
├── docker/                  # Docker配置
└── docker-compose.yml       # 容器编排
```

## 开发工作流

### 1. 功能开发

1. **创建功能分支**
```bash
git checkout -b feature/new-feature-name
```

2. **开发功能**
- 前端: 在 `frontend/src/` 下创建组件和页面
- 后端: 在 `backend/src/` 下创建API和服务
- 遵循现有的代码结构和命名规范

3. **测试功能**
```bash
npm run test
npm run test:frontend
npm run test:backend
```

4. **提交代码**
```bash
git add .
git commit -m "feat: add new feature description"
git push origin feature/new-feature-name
```

### 2. 代码规范

#### 前端 (TypeScript/React)
- 使用函数组件和Hooks
- 遵循React最佳实践
- 使用TypeScript严格模式
- 组件文件使用PascalCase命名
- 工具函数使用camelCase命名

#### 后端 (JavaScript/Node.js)
- 使用ES6+语法
- 遵循RESTful API设计
- 使用async/await处理异步操作
- 文件名使用camelCase
- 常量使用UPPER_SNAKE_CASE

#### 通用规范
- 使用ESLint和Prettier进行代码格式化
- 提交信息遵循Conventional Commits规范
- 函数和变量使用有意义的英文命名
- 注释使用中文，代码使用英文

### 3. API开发

#### 创建新的API端点

1. **定义路由** (`backend/src/routes/`)
```javascript
const express = require('express')
const router = express.Router()
const controller = require('../controllers/exampleController')

router.get('/', controller.getAll)
router.post('/', controller.create)
router.get('/:id', controller.getById)
router.put('/:id', controller.update)
router.delete('/:id', controller.delete)

module.exports = router
```

2. **实现控制器** (`backend/src/controllers/`)
```javascript
const service = require('../services/exampleService')

exports.getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.query)
    res.json(result)
  } catch (error) {
    next(error)
  }
}
```

3. **实现服务** (`backend/src/services/`)
```javascript
const Model = require('../models/Example')

exports.getAll = async (query) => {
  const { page = 1, limit = 10, search } = query
  // 业务逻辑实现
  return await Model.find(searchCondition)
    .limit(limit * 1)
    .skip((page - 1) * limit)
}
```

### 4. 前端组件开发

#### 创建新组件

1. **组件结构**
```
components/
├── ExampleComponent/
│   ├── index.tsx
│   ├── styles.css
│   └── types.ts
```

2. **组件实现**
```typescript
// index.tsx
import React from 'react'
import { Button } from 'antd'
import './styles.css'
import { ExampleProps } from './types'

const ExampleComponent: React.FC<ExampleProps> = ({ title, onAction }) => {
  return (
    <div className="example-component">
      <h2>{title}</h2>
      <Button onClick={onAction}>操作</Button>
    </div>
  )
}

export default ExampleComponent
```

3. **类型定义**
```typescript
// types.ts
export interface ExampleProps {
  title: string
  onAction: () => void
}
```

### 5. 状态管理

#### 创建Redux Slice

```typescript
// store/slices/exampleSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const fetchData = createAsyncThunk(
  'example/fetchData',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.getData(params)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const exampleSlice = createSlice({
  name: 'example',
  initialState: {
    data: [],
    loading: false,
    error: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchData.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchData.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
      })
      .addCase(fetchData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  }
})

export const { clearError } = exampleSlice.actions
export default exampleSlice.reducer
```

## 测试

### 前端测试
```bash
cd frontend
npm test                    # 运行所有测试
npm run test:watch         # 监听模式
npm run test:coverage      # 生成覆盖率报告
```

### 后端测试
```bash
cd backend
npm test                    # 运行所有测试
npm run test:watch         # 监听模式
npm run test:coverage      # 生成覆盖率报告
```

### 集成测试
```bash
npm run test:e2e           # 端到端测试
```

## 部署

### 开发环境部署
```bash
# 使用Docker Compose
docker-compose up -d

# 查看日志
docker-compose logs -f backend
```

### 生产环境部署
```bash
# 构建生产版本
npm run build

# 使用生产配置启动
docker-compose --profile production up -d
```

## 调试

### 前端调试
- 使用浏览器开发者工具
- React Developer Tools
- Redux DevTools

### 后端调试
- 使用VS Code调试器
- 查看日志文件: `backend/logs/`
- 使用Postman测试API

## 常见问题

### 1. 端口冲突
如果端口被占用，修改以下配置：
- 前端: `frontend/vite.config.ts` 中的 `server.port`
- 后端: `backend/.env` 中的 `PORT`

### 2. 数据库连接失败
检查MongoDB是否正在运行：
```bash
# 使用Docker启动MongoDB
docker-compose up -d mongodb

# 检查连接
mongosh mongodb://localhost:27017/jianyi-translator
```

### 3. OpenAI API错误
确保在 `.env` 文件中设置了正确的API密钥：
```bash
OPENAI_API_KEY=your-actual-api-key
```

### 4. 文件上传失败
检查上传目录权限：
```bash
chmod 755 backend/uploads
```

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

Copyright © 2025 简仪科技. All rights reserved.
