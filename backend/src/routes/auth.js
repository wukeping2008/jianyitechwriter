const express = require('express')
const { body } = require('express-validator')
const authController = require('../controllers/authController')
const { authenticate, rateLimit } = require('../middleware/auth')

const router = express.Router()

// 输入验证规则
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('用户名长度必须在3-30个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字'),
  
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('姓名长度必须在2-100个字符之间'),
  
  body('role')
    .optional()
    .isIn(['user', 'translator', 'reviewer', 'admin'])
    .withMessage('角色必须是user、translator、reviewer或admin之一')
]

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址'),
  
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
  
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('记住我必须是布尔值')
]

const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('用户名长度必须在3-30个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('姓名长度必须在2-100个字符之间'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('部门名称不能超过100个字符'),
  
  body('jobTitle')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('职位名称不能超过100个字符'),
  
  body('preferences.language')
    .optional()
    .isIn(['zh', 'en'])
    .withMessage('语言必须是zh或en'),
  
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('主题必须是light、dark或auto'),
  
  body('preferences.defaultSourceLanguage')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('源语言代码长度必须在2-5个字符之间'),
  
  body('preferences.defaultTargetLanguage')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('目标语言代码长度必须在2-5个字符之间'),
  
  body('preferences.translationQuality')
    .optional()
    .isIn(['fast', 'balanced', 'accurate'])
    .withMessage('翻译质量必须是fast、balanced或accurate'),
  
  body('preferences.autoSave')
    .optional()
    .isBoolean()
    .withMessage('自动保存必须是布尔值'),
  
  body('preferences.showTerminologyHints')
    .optional()
    .isBoolean()
    .withMessage('显示术语提示必须是布尔值'),
  
  body('preferences.enableKeyboardShortcuts')
    .optional()
    .isBoolean()
    .withMessage('启用键盘快捷键必须是布尔值')
]

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('当前密码不能为空'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码长度至少6个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('新密码必须包含至少一个小写字母、一个大写字母和一个数字'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('确认密码与新密码不匹配')
      }
      return true
    })
]

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址')
]

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('重置令牌不能为空'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码长度至少6个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('新密码必须包含至少一个小写字母、一个大写字母和一个数字')
]

// 应用限流中间件
const authRateLimit = rateLimit(15 * 60 * 1000, 5) // 15分钟内最多5次认证请求
const generalRateLimit = rateLimit(15 * 60 * 1000, 100) // 15分钟内最多100次一般请求

// 路由定义

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', authRateLimit, registerValidation, authController.register)

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', authRateLimit, loginValidation, authController.login)

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me', authenticate, authController.getCurrentUser)

/**
 * @route   PUT /api/auth/profile
 * @desc    更新用户资料
 * @access  Private
 */
router.put('/profile', authenticate, generalRateLimit, updateProfileValidation, authController.updateProfile)

/**
 * @route   PUT /api/auth/change-password
 * @desc    修改密码
 * @access  Private
 */
router.put('/change-password', authenticate, authRateLimit, changePasswordValidation, authController.changePassword)

/**
 * @route   POST /api/auth/forgot-password
 * @desc    忘记密码
 * @access  Public
 */
router.post('/forgot-password', authRateLimit, forgotPasswordValidation, authController.forgotPassword)

/**
 * @route   POST /api/auth/reset-password
 * @desc    重置密码
 * @access  Public
 */
router.post('/reset-password', authRateLimit, resetPasswordValidation, authController.resetPassword)

/**
 * @route   POST /api/auth/refresh-token
 * @desc    刷新访问令牌
 * @access  Public
 */
router.post('/refresh-token', generalRateLimit, authController.refreshToken)

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout)

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    验证邮箱
 * @access  Public
 */
router.get('/verify-email/:token', authController.verifyEmail)

module.exports = router
