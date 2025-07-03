// 加载环境变量
require('dotenv').config()

// 设置测试环境
process.env.NODE_ENV = 'test'

// 如果没有设置Claude API密钥，使用测试模式
if (!process.env.CLAUDE_API_KEY) {
  console.warn('⚠️  Claude API密钥未设置，某些测试可能会失败')
  console.warn('请在.env文件中设置CLAUDE_API_KEY')
}

// 全局测试配置
global.console = {
  ...console,
  // 在测试中保持console.log输出
  log: jest.fn((...args) => {
    process.stdout.write(args.join(' ') + '\n')
  }),
  error: jest.fn((...args) => {
    process.stderr.write(args.join(' ') + '\n')
  }),
  warn: jest.fn((...args) => {
    process.stdout.write('WARN: ' + args.join(' ') + '\n')
  }),
  info: jest.fn((...args) => {
    process.stdout.write('INFO: ' + args.join(' ') + '\n')
  })
}
