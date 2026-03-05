import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 测试文件匹配模式
    include: ['tests/**/*.test.js'],
    // 环境
    environment: 'node',
    // 全局变量
    globals: true,
    // 超时时间
    testTimeout: 10000,
  },
});
