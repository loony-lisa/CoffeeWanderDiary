import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    // 输出目录
    outDir: 'dist',
    
    // 库模式配置
    lib: {
      entry: path.resolve(__dirname, 'game-entry.js'),
      name: 'CoffeeWanderDiary',
      formats: ['cjs'],
      fileName: () => 'game.js'
    },
    
    // Rollup 配置
    rollupOptions: {
      // 不将任何依赖视为外部依赖
      external: [],
      
      output: {
        // 内联动态导入
        inlineDynamicImports: true,
        
        // 导出模式
        exports: 'auto'
      }
    },
    
    // 是否生成 source map
    sourcemap: true,
    
    // 压缩配置
    minify: 'esbuild',
    
    // ESBuild 配置
    esbuild: {
      drop: ['debugger'],
      keepNames: true
    },
    
    // 目标环境
    target: 'es2015'
  },
  
  // 解析配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@managers': path.resolve(__dirname, './managers'),
      '@ui': path.resolve(__dirname, './ui'),
      '@utils': path.resolve(__dirname, './utils'),
      '@data': path.resolve(__dirname, './data')
    }
  },
  
  // 优化依赖
  optimizeDeps: {
    include: ['pixi.js']
  }
})
