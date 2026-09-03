import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    // miniprogram/ 不含测试：它是 miniprogramRoot，里面的文件会被打进小程序包
    include: ['cloud/**/*.test.js', 'tests/**/*.test.js', 'scripts/**/*.test.js'],
    environment: 'node',
  },
})
