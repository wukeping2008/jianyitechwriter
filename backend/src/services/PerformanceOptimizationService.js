const EventEmitter = require('events')
const logger = require('../utils/logger')
const cluster = require('cluster')
const os = require('os')

class PerformanceOptimizationService extends EventEmitter {
  constructor() {
    super()
    
    // 性能配置
    this.config = {
      // 缓存配置
      cache: {
        enabled: true,
        maxSize: 100 * 1024 * 1024, // 100MB
        ttl: 30 * 60 * 1000, // 30分钟
        cleanupInterval: 5 * 60 * 1000 // 5分钟清理一次
      },
      
      // 连接池配置
      connectionPool: {
        maxConnections: 100,
        minConnections: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 300000
      },
      
      // 压缩配置
      compression: {
        enabled: true,
        threshold: 1024, // 1KB以上才压缩
        level: 6 // 压缩级别 1-9
      },
      
      // 并发控制
      concurrency: {
        maxConcurrentRequests: 1000,
        maxConcurrentTranslations: 50,
        maxConcurrentQualityChecks: 20
      },
      
      // 内存管理
      memory: {
        maxHeapSize: 2 * 1024 * 1024 * 1024, // 2GB
        gcThreshold: 0.8, // 80%时触发GC
        monitorInterval: 60000 // 1分钟检查一次
      }
    }
    
    // 缓存系统
    this.cache = new Map()
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0
    }
    
    // 连接池
    this.connectionPools = new Map()
    
    // 性能指标
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimes: []
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      },
      cpu: {
        usage: 0,
        loadAverage: []
      },
      cache: {
        hitRate: 0,
        size: 0,
        memoryUsage: 0
      }
    }
    
    // 性能监控定时器
    this.monitoringInterval = null
    this.cleanupInterval = null
  }

  /**
   * 初始化性能优化服务
   */
  async initialize() {
    try {
      logger.info('初始化性能优化服务')
      
      // 启动缓存清理
      this.startCacheCleanup()
      
      // 启动性能监控
      this.startPerformanceMonitoring()
      
      // 优化Node.js设置
      this.optimizeNodeSettings()
      
      // 设置内存监控
      this.setupMemoryMonitoring()
      
      this.emit('initialized')
      logger.info('性能优化服务初始化完成')
      
    } catch (error) {
      logger.error('性能优化服务初始化失败:', error)
      throw error
    }
  }

  /**
   * 缓存管理
   */
  
  // 设置缓存
  setCache(key, value, ttl = this.config.cache.ttl) {
    if (!this.config.cache.enabled) return false
    
    try {
      const item = {
        value: value,
        timestamp: Date.now(),
        ttl: ttl,
        size: this.calculateSize(value)
      }
      
      // 检查缓存大小限制
      if (this.getCacheSize() + item.size > this.config.cache.maxSize) {
        this.evictLRU()
      }
      
      this.cache.set(key, item)
      this.cacheStats.sets++
      this.cacheStats.size = this.cache.size
      
      return true
    } catch (error) {
      logger.error('设置缓存失败:', error)
      return false
    }
  }
  
  // 获取缓存
  getCache(key) {
    if (!this.config.cache.enabled) return null
    
    const item = this.cache.get(key)
    if (!item) {
      this.cacheStats.misses++
      return null
    }
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      this.cacheStats.deletes++
      this.cacheStats.misses++
      return null
    }
    
    this.cacheStats.hits++
    return item.value
  }
  
  // 删除缓存
  deleteCache(key) {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.cacheStats.deletes++
      this.cacheStats.size = this.cache.size
    }
    return deleted
  }
  
  // 清空缓存
  clearCache() {
    const size = this.cache.size
    this.cache.clear()
    this.cacheStats.deletes += size
    this.cacheStats.size = 0
    logger.info(`清空缓存，删除 ${size} 个项目`)
  }
  
  // LRU淘汰
  evictLRU() {
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    // 删除最老的25%
    const toDelete = Math.ceil(entries.length * 0.25)
    for (let i = 0; i < toDelete; i++) {
      this.cache.delete(entries[i][0])
      this.cacheStats.deletes++
    }
    
    this.cacheStats.size = this.cache.size
    logger.info(`LRU淘汰，删除 ${toDelete} 个缓存项目`)
  }

  /**
   * 数据库连接池优化
   */
  
  // 创建连接池
  createConnectionPool(name, config) {
    const pool = {
      name: name,
      connections: [],
      activeConnections: 0,
      config: { ...this.config.connectionPool, ...config },
      stats: {
        created: 0,
        destroyed: 0,
        acquired: 0,
        released: 0,
        timeouts: 0
      }
    }
    
    this.connectionPools.set(name, pool)
    logger.info(`创建连接池: ${name}`)
    return pool
  }
  
  // 获取连接
  async acquireConnection(poolName, timeout = 30000) {
    const pool = this.connectionPools.get(poolName)
    if (!pool) {
      throw new Error(`连接池不存在: ${poolName}`)
    }
    
    const startTime = Date.now()
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pool.stats.timeouts++
        reject(new Error(`获取连接超时: ${poolName}`))
      }, timeout)
      
      const tryAcquire = () => {
        // 检查是否有可用连接
        const availableConnection = pool.connections.find(conn => !conn.inUse)
        
        if (availableConnection) {
          clearTimeout(timeoutId)
          availableConnection.inUse = true
          availableConnection.lastUsed = Date.now()
          pool.activeConnections++
          pool.stats.acquired++
          
          const acquireTime = Date.now() - startTime
          this.recordMetric('connectionPool', 'acquireTime', acquireTime)
          
          resolve(availableConnection)
          return
        }
        
        // 如果连接数未达到最大值，创建新连接
        if (pool.connections.length < pool.config.maxConnections) {
          const newConnection = this.createConnection(pool)
          clearTimeout(timeoutId)
          resolve(newConnection)
          return
        }
        
        // 等待连接释放
        setTimeout(tryAcquire, 10)
      }
      
      tryAcquire()
    })
  }
  
  // 释放连接
  releaseConnection(poolName, connection) {
    const pool = this.connectionPools.get(poolName)
    if (!pool) return false
    
    connection.inUse = false
    connection.lastUsed = Date.now()
    pool.activeConnections--
    pool.stats.released++
    
    return true
  }

  /**
   * 请求优化
   */
  
  // 请求去重
  deduplicateRequests(key, requestFn) {
    const cacheKey = `request_${key}`
    const cached = this.getCache(cacheKey)
    
    if (cached) {
      return Promise.resolve(cached)
    }
    
    // 检查是否有正在进行的相同请求
    if (this.pendingRequests && this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)
    }
    
    if (!this.pendingRequests) {
      this.pendingRequests = new Map()
    }
    
    const promise = requestFn()
      .then(result => {
        this.setCache(cacheKey, result, 5 * 60 * 1000) // 5分钟缓存
        this.pendingRequests.delete(key)
        return result
      })
      .catch(error => {
        this.pendingRequests.delete(key)
        throw error
      })
    
    this.pendingRequests.set(key, promise)
    return promise
  }
  
  // 批量请求优化
  batchRequests(requests, batchSize = 10, delay = 100) {
    return new Promise((resolve, reject) => {
      const results = []
      const batches = []
      
      // 分批处理
      for (let i = 0; i < requests.length; i += batchSize) {
        batches.push(requests.slice(i, i + batchSize))
      }
      
      let completedBatches = 0
      
      const processBatch = async (batch, index) => {
        try {
          const batchResults = await Promise.all(batch)
          results[index] = batchResults
          completedBatches++
          
          if (completedBatches === batches.length) {
            resolve(results.flat())
          }
        } catch (error) {
          reject(error)
        }
      }
      
      // 延迟执行批次
      batches.forEach((batch, index) => {
        setTimeout(() => {
          processBatch(batch, index)
        }, index * delay)
      })
    })
  }

  /**
   * 内存优化
   */
  
  // 内存监控
  setupMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage()
      this.metrics.memory = {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      }
      
      // 检查内存使用率
      const heapUsageRatio = memUsage.heapUsed / memUsage.heapTotal
      
      if (heapUsageRatio > this.config.memory.gcThreshold) {
        this.triggerGarbageCollection()
      }
      
      // 发出内存警告
      if (memUsage.heapUsed > this.config.memory.maxHeapSize * 0.9) {
        this.emit('memoryWarning', {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          threshold: this.config.memory.maxHeapSize
        })
      }
      
    }, this.config.memory.monitorInterval)
  }
  
  // 触发垃圾回收
  triggerGarbageCollection() {
    if (global.gc) {
      const beforeGC = process.memoryUsage().heapUsed
      global.gc()
      const afterGC = process.memoryUsage().heapUsed
      const freed = beforeGC - afterGC
      
      logger.info(`手动GC完成，释放内存: ${(freed / 1024 / 1024).toFixed(2)}MB`)
      
      this.emit('garbageCollected', {
        beforeGC: beforeGC,
        afterGC: afterGC,
        freed: freed
      })
    }
  }

  /**
   * CPU优化
   */
  
  // CPU使用率监控
  monitorCPUUsage() {
    const startUsage = process.cpuUsage()
    const startTime = Date.now()
    
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage)
      const endTime = Date.now()
      const duration = endTime - startTime
      
      const userCPU = endUsage.user / 1000 // 转换为毫秒
      const systemCPU = endUsage.system / 1000
      const totalCPU = userCPU + systemCPU
      
      this.metrics.cpu.usage = (totalCPU / duration) * 100
      this.metrics.cpu.loadAverage = os.loadavg()
      
    }, 1000)
  }
  
  // 负载均衡
  distributeLoad(tasks, workers = os.cpus().length) {
    const chunks = []
    const chunkSize = Math.ceil(tasks.length / workers)
    
    for (let i = 0; i < tasks.length; i += chunkSize) {
      chunks.push(tasks.slice(i, i + chunkSize))
    }
    
    return chunks
  }

  /**
   * 网络优化
   */
  
  // 响应压缩
  compressResponse(data, type = 'gzip') {
    if (!this.config.compression.enabled) return data
    
    const dataSize = Buffer.byteLength(JSON.stringify(data))
    if (dataSize < this.config.compression.threshold) return data
    
    try {
      const zlib = require('zlib')
      let compressed
      
      switch (type) {
        case 'gzip':
          compressed = zlib.gzipSync(JSON.stringify(data), {
            level: this.config.compression.level
          })
          break
        case 'deflate':
          compressed = zlib.deflateSync(JSON.stringify(data), {
            level: this.config.compression.level
          })
          break
        default:
          return data
      }
      
      const compressionRatio = compressed.length / dataSize
      logger.debug(`响应压缩完成，压缩率: ${(compressionRatio * 100).toFixed(2)}%`)
      
      return {
        compressed: true,
        type: type,
        data: compressed,
        originalSize: dataSize,
        compressedSize: compressed.length
      }
      
    } catch (error) {
      logger.error('响应压缩失败:', error)
      return data
    }
  }

  /**
   * 性能监控和统计
   */
  
  // 记录性能指标
  recordMetric(category, metric, value) {
    if (!this.performanceData) {
      this.performanceData = new Map()
    }
    
    const key = `${category}.${metric}`
    const data = this.performanceData.get(key) || []
    
    data.push({
      value: value,
      timestamp: Date.now()
    })
    
    // 保持最近1000个数据点
    if (data.length > 1000) {
      data.shift()
    }
    
    this.performanceData.set(key, data)
  }
  
  // 获取性能统计
  getPerformanceStats() {
    const stats = {
      cache: {
        hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100 || 0,
        size: this.cacheStats.size,
        memoryUsage: this.getCacheSize(),
        operations: {
          hits: this.cacheStats.hits,
          misses: this.cacheStats.misses,
          sets: this.cacheStats.sets,
          deletes: this.cacheStats.deletes
        }
      },
      memory: this.metrics.memory,
      cpu: this.metrics.cpu,
      connectionPools: this.getConnectionPoolStats(),
      requests: this.metrics.requests
    }
    
    return stats
  }
  
  // 获取连接池统计
  getConnectionPoolStats() {
    const stats = {}
    
    for (const [name, pool] of this.connectionPools) {
      stats[name] = {
        totalConnections: pool.connections.length,
        activeConnections: pool.activeConnections,
        availableConnections: pool.connections.length - pool.activeConnections,
        stats: pool.stats
      }
    }
    
    return stats
  }

  /**
   * 优化建议
   */
  
  // 生成优化建议
  generateOptimizationRecommendations() {
    const recommendations = []
    const stats = this.getPerformanceStats()
    
    // 缓存优化建议
    if (stats.cache.hitRate < 70) {
      recommendations.push({
        type: 'cache',
        priority: 'high',
        message: '缓存命中率较低，建议优化缓存策略',
        details: `当前命中率: ${stats.cache.hitRate.toFixed(2)}%`,
        actions: ['增加缓存时间', '优化缓存键设计', '预热常用数据']
      })
    }
    
    // 内存优化建议
    const memoryUsageRatio = stats.memory.heapUsed / stats.memory.heapTotal
    if (memoryUsageRatio > 0.8) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: '内存使用率过高',
        details: `当前使用率: ${(memoryUsageRatio * 100).toFixed(2)}%`,
        actions: ['增加内存限制', '优化数据结构', '及时释放不用的对象']
      })
    }
    
    // CPU优化建议
    if (stats.cpu.usage > 80) {
      recommendations.push({
        type: 'cpu',
        priority: 'medium',
        message: 'CPU使用率较高',
        details: `当前使用率: ${stats.cpu.usage.toFixed(2)}%`,
        actions: ['优化算法复杂度', '使用异步处理', '考虑负载均衡']
      })
    }
    
    return recommendations
  }

  // 辅助方法
  calculateSize(obj) {
    return Buffer.byteLength(JSON.stringify(obj))
  }
  
  getCacheSize() {
    let totalSize = 0
    for (const item of this.cache.values()) {
      totalSize += item.size
    }
    return totalSize
  }
  
  createConnection(pool) {
    const connection = {
      id: `${pool.name}_${Date.now()}_${Math.random()}`,
      inUse: true,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      pool: pool.name
    }
    
    pool.connections.push(connection)
    pool.activeConnections++
    pool.stats.created++
    
    return connection
  }
  
  startCacheCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache()
    }, this.config.cache.cleanupInterval)
  }
  
  cleanupExpiredCache() {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      this.cacheStats.deletes += cleaned
      this.cacheStats.size = this.cache.size
      logger.debug(`清理过期缓存: ${cleaned} 个项目`)
    }
  }
  
  startPerformanceMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.monitorCPUUsage()
      this.updateMetrics()
    }, 60000) // 每分钟监控一次
  }
  
  updateMetrics() {
    this.metrics.cache = {
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100 || 0,
      size: this.cacheStats.size,
      memoryUsage: this.getCacheSize()
    }
    
    this.emit('metricsUpdated', this.metrics)
  }
  
  optimizeNodeSettings() {
    // 设置最大监听器数量
    process.setMaxListeners(0)
    
    // 优化事件循环
    process.nextTick(() => {
      logger.debug('Node.js设置优化完成')
    })
  }
  
  // 清理资源
  cleanup() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.clearCache()
    this.connectionPools.clear()
    
    logger.info('性能优化服务清理完成')
  }
}

// 创建单例实例
const performanceOptimizationService = new PerformanceOptimizationService()

module.exports = performanceOptimizationService
