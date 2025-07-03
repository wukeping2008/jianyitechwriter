const express = require('express')
const router = express.Router()
const { authenticate, authorize } = require('../middleware/auth')
const jsonDB = require('../config/jsonDatabase')

// 获取所有术语
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, category, page = 1, limit = 50 } = req.query
    
    let terminology = await jsonDB.find('terminology')
    
    // 搜索过滤
    if (search) {
      terminology = terminology.filter(term => 
        term.source?.toLowerCase().includes(search.toLowerCase()) ||
        term.target?.toLowerCase().includes(search.toLowerCase()) ||
        term.description?.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    // 分类过滤
    if (category) {
      terminology = terminology.filter(term => term.category === category)
    }
    
    // 分页
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + parseInt(limit)
    const paginatedTerms = terminology.slice(startIndex, endIndex)

    res.json({
      success: true,
      data: paginatedTerms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: terminology.length,
        pages: Math.ceil(terminology.length / limit)
      }
    })
  } catch (error) {
    console.error('获取术语列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取单个术语
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const term = await jsonDB.findById('terminology', id)

    if (!term) {
      return res.status(404).json({
        success: false,
        message: '术语不存在'
      })
    }

    res.json({
      success: true,
      data: term
    })
  } catch (error) {
    console.error('获取术语错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 创建术语
router.post('/', authenticate, authorize('manage_terminology'), async (req, res) => {
  try {
    const termData = {
      ...req.body,
      createdBy: req.user.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const term = await jsonDB.insertOne('terminology', termData)

    res.status(201).json({
      success: true,
      message: '术语创建成功',
      data: term
    })
  } catch (error) {
    console.error('创建术语错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 更新术语
router.put('/:id', authenticate, authorize('manage_terminology'), async (req, res) => {
  try {
    const { id } = req.params
    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString()
    }

    const updatedTerm = await jsonDB.updateById('terminology', id, updates)

    if (!updatedTerm) {
      return res.status(404).json({
        success: false,
        message: '术语不存在'
      })
    }

    res.json({
      success: true,
      message: '术语更新成功',
      data: updatedTerm
    })
  } catch (error) {
    console.error('更新术语错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 删除术语
router.delete('/:id', authenticate, authorize('manage_terminology'), async (req, res) => {
  try {
    const { id } = req.params
    const deletedTerm = await jsonDB.deleteById('terminology', id)

    if (!deletedTerm) {
      return res.status(404).json({
        success: false,
        message: '术语不存在'
      })
    }

    res.json({
      success: true,
      message: '术语删除成功'
    })
  } catch (error) {
    console.error('删除术语错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 批量导入术语
router.post('/import', authenticate, authorize('manage_terminology'), async (req, res) => {
  try {
    const { terms } = req.body

    if (!Array.isArray(terms)) {
      return res.status(400).json({
        success: false,
        message: '术语数据格式错误'
      })
    }

    const termData = terms.map(term => ({
      ...term,
      createdBy: req.user.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))

    const importedTerms = await jsonDB.insertMany('terminology', termData)

    res.json({
      success: true,
      message: `成功导入 ${importedTerms.length} 个术语`,
      data: importedTerms
    })
  } catch (error) {
    console.error('批量导入术语错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 导出术语
router.get('/export/all', authenticate, async (req, res) => {
  try {
    const terminology = await jsonDB.find('terminology')
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename=terminology.json')
    res.json(terminology)
  } catch (error) {
    console.error('导出术语错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

module.exports = router
