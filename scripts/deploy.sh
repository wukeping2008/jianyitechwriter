#!/bin/bash

# 简仪科技翻译系统部署脚本
# 版本: 1.0.0
# 作者: 简仪科技开发团队

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的命令
check_dependencies() {
    log_info "检查部署依赖..."
    
    local deps=("docker" "docker-compose" "curl" "jq")
    for dep in "${deps[@]}"; do
        if ! command -v $dep &> /dev/null; then
            log_error "$dep 未安装，请先安装后再运行部署脚本"
            exit 1
        fi
    done
    
    log_success "所有依赖检查通过"
}

# 检查环境变量
check_environment() {
    log_info "检查环境变量..."
    
    if [ ! -f ".env.prod" ]; then
        log_warning ".env.prod 文件不存在，创建默认配置..."
        cat > .env.prod << EOF
# 数据库配置
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=jianyi_mongo_2024
MONGO_DATABASE=jianyi_translator

# Redis配置
REDIS_PASSWORD=jianyi_redis_2024

# JWT配置
JWT_SECRET=jianyi-tech-super-secret-key-2024

# API密钥（请填入实际的API密钥）
CLAUDE_API_KEY=your_claude_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# 应用配置
APP_VERSION=1.0.0
FRONTEND_URL=http://localhost
BACKEND_URL=http://localhost:5000/api
LOG_LEVEL=info

# 监控配置
GRAFANA_USER=admin
GRAFANA_PASSWORD=jianyi_grafana_2024
EOF
        log_warning "请编辑 .env.prod 文件，填入正确的API密钥和配置"
        read -p "按回车键继续..."
    fi
    
    source .env.prod
    
    # 检查关键环境变量
    if [ -z "$CLAUDE_API_KEY" ] || [ "$CLAUDE_API_KEY" = "your_claude_api_key_here" ]; then
        log_warning "CLAUDE_API_KEY 未设置或使用默认值"
    fi
    
    if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
        log_warning "OPENAI_API_KEY 未设置或使用默认值"
    fi
    
    log_success "环境变量检查完成"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    local dirs=(
        "docker/nginx"
        "docker/mongodb/init"
        "docker/prometheus"
        "docker/grafana/provisioning"
        "backend/logs"
        "backend/uploads"
        "data/mongodb"
        "data/redis"
        "data/prometheus"
        "data/grafana"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        log_info "创建目录: $dir"
    done
    
    log_success "目录创建完成"
}

# 生成nginx配置
generate_nginx_config() {
    log_info "生成nginx配置..."
    
    cat > docker/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # 基本设置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 上游服务器
    upstream backend {
        server backend:5000;
        keepalive 32;
    }

    # 主服务器配置
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # 健康检查
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # API代理
        location /api/ {
            proxy_pass http://backend/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # 静态文件
        location / {
            try_files $uri $uri/ /index.html;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # 安全设置
        location ~ /\. {
            deny all;
        }
    }
}
EOF
    
    log_success "nginx配置生成完成"
}

# 生成Prometheus配置
generate_prometheus_config() {
    log_info "生成Prometheus配置..."
    
    cat > docker/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'jianyi-translator-backend'
    static_configs:
      - targets: ['backend:5000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'jianyi-translator-frontend'
    static_configs:
      - targets: ['frontend:80']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb:27017']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s
EOF
    
    log_success "Prometheus配置生成完成"
}

# 运行测试
run_tests() {
    log_info "运行测试套件..."
    
    # 后端测试
    log_info "运行后端测试..."
    cd backend
    if npm test; then
        log_success "后端测试通过"
    else
        log_error "后端测试失败"
        exit 1
    fi
    cd ..
    
    # 前端测试
    log_info "运行前端测试..."
    cd frontend
    if npm test -- --watchAll=false; then
        log_success "前端测试通过"
    else
        log_error "前端测试失败"
        exit 1
    fi
    cd ..
    
    log_success "所有测试通过"
}

# 构建镜像
build_images() {
    log_info "构建Docker镜像..."
    
    # 设置构建参数
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
    
    # 构建镜像
    if docker-compose -f docker-compose.prod.yml build --no-cache; then
        log_success "镜像构建完成"
    else
        log_error "镜像构建失败"
        exit 1
    fi
}

# 部署服务
deploy_services() {
    log_info "部署服务..."
    
    # 停止现有服务
    log_info "停止现有服务..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    
    # 启动服务
    log_info "启动服务..."
    if docker-compose -f docker-compose.prod.yml up -d; then
        log_success "服务启动完成"
    else
        log_error "服务启动失败"
        exit 1
    fi
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            log_success "前端服务就绪"
            break
        fi
        
        attempt=$((attempt + 1))
        log_info "等待前端服务就绪... ($attempt/$max_attempts)"
        sleep 5
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "前端服务启动超时"
        exit 1
    fi
    
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:5000/health > /dev/null 2>&1; then
            log_success "后端服务就绪"
            break
        fi
        
        attempt=$((attempt + 1))
        log_info "等待后端服务就绪... ($attempt/$max_attempts)"
        sleep 5
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "后端服务启动超时"
        exit 1
    fi
}

# 运行健康检查
health_check() {
    log_info "运行健康检查..."
    
    # 检查前端
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log_success "前端健康检查通过"
    else
        log_error "前端健康检查失败"
        return 1
    fi
    
    # 检查后端
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        log_success "后端健康检查通过"
    else
        log_error "后端健康检查失败"
        return 1
    fi
    
    # 检查系统状态
    local auth_response=$(curl -s -X POST http://localhost:5000/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@jianyi.tech","password":"admin123"}' || echo "")
    
    if [ -n "$auth_response" ]; then
        log_success "API健康检查通过"
    else
        log_warning "API健康检查失败，可能需要初始化数据"
    fi
    
    log_success "健康检查完成"
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo ""
    echo "=========================================="
    echo "  简仪科技翻译系统部署信息"
    echo "=========================================="
    echo ""
    echo "🌐 前端地址: http://localhost"
    echo "🔧 后端API: http://localhost:5000"
    echo "📊 监控面板: http://localhost:3001 (Grafana)"
    echo "📈 指标收集: http://localhost:9090 (Prometheus)"
    echo ""
    echo "默认登录信息:"
    echo "  管理员: admin@jianyi.tech / admin123"
    echo "  Grafana: admin / jianyi_grafana_2024"
    echo ""
    echo "=========================================="
    echo ""
    
    # 显示容器状态
    log_info "容器状态:"
    docker-compose -f docker-compose.prod.yml ps
    
    echo ""
    log_info "查看日志: docker-compose -f docker-compose.prod.yml logs -f"
    log_info "停止服务: docker-compose -f docker-compose.prod.yml down"
}

# 清理函数
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "部署失败，正在清理..."
        docker-compose -f docker-compose.prod.yml down --remove-orphans
    fi
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  简仪科技翻译系统部署脚本"
    echo "  版本: 1.0.0"
    echo "=========================================="
    echo ""
    
    # 设置错误处理
    trap cleanup EXIT
    
    # 检查参数
    local skip_tests=false
    local skip_build=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --skip-build)
                skip_build=true
                shift
                ;;
            --help)
                echo "用法: $0 [选项]"
                echo ""
                echo "选项:"
                echo "  --skip-tests    跳过测试"
                echo "  --skip-build    跳过镜像构建"
                echo "  --help          显示帮助信息"
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                exit 1
                ;;
        esac
    done
    
    # 执行部署步骤
    check_dependencies
    check_environment
    create_directories
    generate_nginx_config
    generate_prometheus_config
    
    if [ "$skip_tests" = false ]; then
        run_tests
    else
        log_warning "跳过测试"
    fi
    
    if [ "$skip_build" = false ]; then
        build_images
    else
        log_warning "跳过镜像构建"
    fi
    
    deploy_services
    wait_for_services
    health_check
    show_deployment_info
    
    log_success "部署成功完成！"
}

# 运行主函数
main "$@"
