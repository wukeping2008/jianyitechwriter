# 简仪科技文档制作翻译系统 - 部署指南

## 🚀 快速部署

### 环境要求
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git
- Claude API密钥

### 1. 克隆项目
```bash
git clone https://github.com/wukeping2008/jianyitechwriter.git
cd jianyitechwriter
```

### 2. 后端部署

#### 安装依赖
```bash
cd backend
npm install
```

#### 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量文件
nano .env
```

**必须配置的环境变量：**
```env
# Claude AI配置 (必须)
CLAUDE_API_KEY=your_claude_api_key_here

# JWT密钥 (必须)
JWT_SECRET=your_secure_jwt_secret_here

# 其他配置保持默认即可
PORT=5000
NODE_ENV=production
```

#### 启动后端服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 3. 前端部署

#### 安装依赖
```bash
cd ../frontend
npm install
```

#### 构建生产版本
```bash
npm run build
```

#### 启动前端服务
```bash
# 开发模式
npm run dev

# 生产模式 (需要静态文件服务器)
npm run preview
```

## 🐳 Docker部署

### 开发环境
```bash
docker-compose up -d
```

### 生产环境
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## ☁️ 云服务器部署

### 1. 服务器准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2 (进程管理器)
sudo npm install -g pm2

# 安装Nginx (可选，用于反向代理)
sudo apt install nginx -y
```

### 2. 部署应用
```bash
# 克隆项目
git clone https://github.com/wukeping2008/jianyitechwriter.git
cd jianyitechwriter

# 安装后端依赖
cd backend
npm install --production
cp .env.example .env
# 编辑 .env 文件配置必要参数

# 安装前端依赖并构建
cd ../frontend
npm install
npm run build

# 使用PM2启动后端服务
cd ../backend
pm2 start src/app.js --name "jytek-backend"

# 配置PM2开机自启
pm2 startup
pm2 save
```

### 3. Nginx配置 (可选)
```nginx
# /etc/nginx/sites-available/jianyitechwriter
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/jianyitechwriter/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/jianyitechwriter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔧 配置说明

### 环境变量详解

#### 必须配置
- `CLAUDE_API_KEY`: Claude AI API密钥
- `JWT_SECRET`: JWT令牌加密密钥

#### 可选配置
- `PORT`: 后端服务端口 (默认: 5000)
- `NODE_ENV`: 运行环境 (development/production)
- `CORS_ORIGIN`: 前端域名 (默认: http://localhost:3002)
- `MAX_FILE_SIZE`: 最大文件上传大小 (默认: 10MB)

### 数据库配置
系统使用JSON文件作为数据库，无需额外配置。数据文件存储在：
- `backend/data/`: 主要数据存储
- `backend/uploads/`: 文件上传存储
- `backend/logs/`: 日志文件

### 术语库配置
术语库文件位于 `terminology/` 目录：
- `jytek-terminology.json`: 简仪科技专业术语
- `pxi-terminology.json`: PXI相关术语

## 🔒 安全配置

### 1. 环境变量安全
```bash
# 设置文件权限
chmod 600 backend/.env

# 确保.env不被提交到git
echo "backend/.env" >> .gitignore
```

### 2. 防火墙配置
```bash
# 开放必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 5000  # 后端API (如果直接暴露)
sudo ufw enable
```

### 3. SSL证书 (推荐)
```bash
# 使用Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📊 监控和维护

### 1. PM2监控
```bash
# 查看进程状态
pm2 status

# 查看日志
pm2 logs jytek-backend

# 重启服务
pm2 restart jytek-backend

# 监控面板
pm2 monit
```

### 2. 日志管理
```bash
# 查看应用日志
tail -f backend/logs/combined.log

# 查看错误日志
tail -f backend/logs/error.log

# 日志轮转 (可选)
sudo apt install logrotate
```

### 3. 备份策略
```bash
# 备份数据文件
tar -czf backup-$(date +%Y%m%d).tar.gz backend/data/ backend/uploads/

# 定期备份 (crontab)
0 2 * * * /path/to/backup-script.sh
```

## 🚨 故障排除

### 常见问题

#### 1. 后端启动失败
```bash
# 检查端口占用
lsof -i :5000

# 检查环境变量
cat backend/.env

# 查看详细错误
npm run dev
```

#### 2. 前端无法连接后端
- 检查CORS配置
- 确认后端服务运行状态
- 验证API地址配置

#### 3. Claude API调用失败
- 验证API密钥有效性
- 检查网络连接
- 查看API使用限制

#### 4. 文件上传失败
- 检查上传目录权限
- 验证文件大小限制
- 确认磁盘空间充足

### 性能优化

#### 1. 后端优化
```javascript
// 启用gzip压缩
app.use(compression())

// 设置缓存头
app.use(express.static('public', {
  maxAge: '1d'
}))
```

#### 2. 前端优化
```bash
# 构建优化
npm run build -- --mode production

# 启用CDN (可选)
# 配置静态资源CDN加速
```

#### 3. 数据库优化
- 定期清理过期数据
- 压缩JSON文件
- 实施数据分片策略

## 📞 技术支持

如遇到部署问题，请联系：
- 技术支持: support@jytek.com
- 项目地址: https://github.com/wukeping2008/jianyitechwriter
- 文档地址: https://github.com/wukeping2008/jianyitechwriter/wiki

---

**简仪科技** - 专业的测试测量解决方案提供商
