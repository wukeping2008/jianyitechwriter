const fs = require('fs').promises
const path = require('path')
const logger = require('../utils/logger')

class JSONDatabase {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data')
    this.collections = new Map()
    this.initialized = false
  }

  async init() {
    try {
      // 确保数据目录存在
      await fs.mkdir(this.dataDir, { recursive: true })
      
      // 初始化集合文件
      const collections = ['users', 'documents', 'projects', 'templates', 'terminology']
      
      for (const collection of collections) {
        const filePath = path.join(this.dataDir, `${collection}.json`)
        try {
          const data = await fs.readFile(filePath, 'utf8')
          this.collections.set(collection, JSON.parse(data))
        } catch (error) {
          // 文件不存在，创建空集合
          this.collections.set(collection, [])
          await this.saveCollection(collection)
        }
      }
      
      // 初始化默认管理员用户
      await this.initDefaultUser()
      
      this.initialized = true
      logger.info('JSON数据库初始化成功')
      
    } catch (error) {
      logger.error('JSON数据库初始化失败:', error)
      throw error
    }
  }

  async initDefaultUser() {
    const users = this.collections.get('users')
    const adminExists = users.find(user => user.username === 'admin')
    
    if (!adminExists) {
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash('admin123', 12)
      
      const defaultAdmin = {
        id: this.generateId(),
        username: 'admin',
        email: 'admin@jytek.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        profile: {
          firstName: '管理员',
          lastName: '系统',
          department: '技术部',
          position: '系统管理员'
        },
        preferences: {
          language: 'zh-CN',
          theme: 'light',
          notifications: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      users.push(defaultAdmin)
      await this.saveCollection('users')
      logger.info('默认管理员用户创建成功')
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  async saveCollection(collectionName) {
    const filePath = path.join(this.dataDir, `${collectionName}.json`)
    const data = this.collections.get(collectionName) || []
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
  }

  // 查找操作
  async find(collection, query = {}) {
    if (!this.initialized) await this.init()
    
    const data = this.collections.get(collection) || []
    
    if (Object.keys(query).length === 0) {
      return data
    }
    
    return data.filter(item => {
      return Object.keys(query).every(key => {
        if (key.includes('.')) {
          // 支持嵌套查询，如 'profile.firstName'
          const keys = key.split('.')
          let value = item
          for (const k of keys) {
            value = value?.[k]
          }
          return value === query[key]
        }
        return item[key] === query[key]
      })
    })
  }

  // 查找单个文档
  async findOne(collection, query) {
    const results = await this.find(collection, query)
    return results[0] || null
  }

  // 根据ID查找
  async findById(collection, id) {
    return await this.findOne(collection, { id })
  }

  // 插入操作
  async insertOne(collection, document) {
    if (!this.initialized) await this.init()
    
    const data = this.collections.get(collection) || []
    const newDoc = {
      id: this.generateId(),
      ...document,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    data.push(newDoc)
    this.collections.set(collection, data)
    await this.saveCollection(collection)
    
    return newDoc
  }

  // 批量插入
  async insertMany(collection, documents) {
    if (!this.initialized) await this.init()
    
    const data = this.collections.get(collection) || []
    const newDocs = documents.map(doc => ({
      id: this.generateId(),
      ...doc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
    
    data.push(...newDocs)
    this.collections.set(collection, data)
    await this.saveCollection(collection)
    
    return newDocs
  }

  // 更新操作
  async updateOne(collection, query, update) {
    if (!this.initialized) await this.init()
    
    const data = this.collections.get(collection) || []
    const index = data.findIndex(item => {
      return Object.keys(query).every(key => item[key] === query[key])
    })
    
    if (index !== -1) {
      data[index] = {
        ...data[index],
        ...update,
        updatedAt: new Date().toISOString()
      }
      this.collections.set(collection, data)
      await this.saveCollection(collection)
      return data[index]
    }
    
    return null
  }

  // 根据ID更新
  async updateById(collection, id, update) {
    return await this.updateOne(collection, { id }, update)
  }

  // 删除操作
  async deleteOne(collection, query) {
    if (!this.initialized) await this.init()
    
    const data = this.collections.get(collection) || []
    const index = data.findIndex(item => {
      return Object.keys(query).every(key => item[key] === query[key])
    })
    
    if (index !== -1) {
      const deleted = data.splice(index, 1)[0]
      this.collections.set(collection, data)
      await this.saveCollection(collection)
      return deleted
    }
    
    return null
  }

  // 根据ID删除
  async deleteById(collection, id) {
    return await this.deleteOne(collection, { id })
  }

  // 批量删除
  async deleteMany(collection, query) {
    if (!this.initialized) await this.init()
    
    const data = this.collections.get(collection) || []
    const toDelete = []
    
    for (let i = data.length - 1; i >= 0; i--) {
      const item = data[i]
      const matches = Object.keys(query).every(key => item[key] === query[key])
      if (matches) {
        toDelete.push(data.splice(i, 1)[0])
      }
    }
    
    if (toDelete.length > 0) {
      this.collections.set(collection, data)
      await this.saveCollection(collection)
    }
    
    return toDelete
  }

  // 计数操作
  async count(collection, query = {}) {
    const results = await this.find(collection, query)
    return results.length
  }

  // 分页查询
  async paginate(collection, query = {}, options = {}) {
    const { page = 1, limit = 10, sort = {} } = options
    let results = await this.find(collection, query)
    
    // 排序
    if (Object.keys(sort).length > 0) {
      const sortKey = Object.keys(sort)[0]
      const sortOrder = sort[sortKey]
      
      results.sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]
        
        if (sortOrder === 1) {
          return aVal > bVal ? 1 : -1
        } else {
          return aVal < bVal ? 1 : -1
        }
      })
    }
    
    const total = results.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    
    return {
      data: results.slice(startIndex, endIndex),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  // 健康检查
  async checkHealth() {
    try {
      await fs.access(this.dataDir)
      return {
        status: 'connected',
        type: 'json-file',
        dataDir: this.dataDir,
        collections: Array.from(this.collections.keys())
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      }
    }
  }

  // 备份数据
  async backup() {
    const backupDir = path.join(this.dataDir, 'backups')
    await fs.mkdir(backupDir, { recursive: true })
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupDir, `backup-${timestamp}.json`)
    
    const allData = {}
    for (const [collection, data] of this.collections) {
      allData[collection] = data
    }
    
    await fs.writeFile(backupPath, JSON.stringify(allData, null, 2), 'utf8')
    logger.info(`数据备份完成: ${backupPath}`)
    
    return backupPath
  }

  // 恢复数据
  async restore(backupPath) {
    try {
      const data = await fs.readFile(backupPath, 'utf8')
      const allData = JSON.parse(data)
      
      for (const [collection, collectionData] of Object.entries(allData)) {
        this.collections.set(collection, collectionData)
        await this.saveCollection(collection)
      }
      
      logger.info(`数据恢复完成: ${backupPath}`)
      return true
    } catch (error) {
      logger.error('数据恢复失败:', error)
      throw error
    }
  }
}

// 创建全局实例
const jsonDB = new JSONDatabase()

module.exports = jsonDB
