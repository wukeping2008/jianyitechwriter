const express = require('express')
const router = express.Router()
const { authenticate, authorize } = require('../middleware/auth')
const jsonDB = require('../config/jsonDatabase')

// 获取所有文档
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, type } = req.query
    
    let query = {}
    
    // 非管理员只能看到自己的文档
    if (req.user.role !== 'admin') {
      query.createdBy = req.user.userId
    }
    
    // 添加搜索条件
    if (status) query.status = status
    if (type) query.type = type
    
    const documents = await jsonDB.find('documents', query)
    
    // 简单的搜索过滤
    let filteredDocs = documents
    if (search) {
      filteredDocs = documents.filter(doc => 
        doc.title?.toLowerCase().includes(search.toLowerCase()) ||
        doc.description?.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    // 分页
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + parseInt(limit)
    const paginatedDocs = filteredDocs.slice(startIndex, endIndex)

    res.json({
      success: true,
      data: paginatedDocs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredDocs.length,
        pages: Math.ceil(filteredDocs.length / limit)
      }
    })
  } catch (error) {
    console.error('获取文档列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取单个文档
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const document = await jsonDB.findById('documents', id)

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文档不存在'
      })
    }

    // 检查权限
    if (req.user.role !== 'admin' && document.createdBy !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      })
    }

    res.json({
      success: true,
      data: document
    })
  } catch (error) {
    console.error('获取文档错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 创建文档
router.post('/', authenticate, authorize('translate_documents'), async (req, res) => {
  try {
    const documentData = {
      ...req.body,
      createdBy: req.user.userId,
      status: 'draft',
      metadata: {
        ...req.body.metadata,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    }

    const document = await jsonDB.insertOne('documents', documentData)

    res.status(201).json({
      success: true,
      message: '文档创建成功',
      data: document
    })
  } catch (error) {
    console.error('创建文档错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 更新文档
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const document = await jsonDB.findById('documents', id)

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文档不存在'
      })
    }

    // 检查权限
    if (req.user.role !== 'admin' && document.createdBy !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      })
    }

    const updates = {
      ...req.body,
      metadata: {
        ...document.metadata,
        ...req.body.metadata,
        lastModified: new Date().toISOString()
      }
    }

    const updatedDocument = await jsonDB.updateById('documents', id, updates)

    res.json({
      success: true,
      message: '文档更新成功',
      data: updatedDocument
    })
  } catch (error) {
    console.error('更新文档错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 删除文档
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const document = await jsonDB.findById('documents', id)

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文档不存在'
      })
    }

    // 检查权限
    if (req.user.role !== 'admin' && document.createdBy !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      })
    }

    await jsonDB.deleteById('documents', id)

    res.json({
      success: true,
      message: '文档删除成功'
    })
  } catch (error) {
    console.error('删除文档错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

module.exports = router
