import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 测试文件匹配模式
    include: ['tests/**/*.test.js'],
    // 环境：node 环境（Chrome Extension 测试通常不需要 jsdom）
    environment: 'node',
    // 全局变量
    globals: true,
    // 超时时间
    testTimeout: 10000,
    // 注意：setupFiles 已移除，因为测试文件自己管理 mock
    // tests/setup.js 可作为独立的 mock 库导入使用
    // 覆盖率配置（可选）
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      // 排除不需要测试覆盖的文件
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.js',
        '**/*.config.js'
      ]
    }
  },
});
