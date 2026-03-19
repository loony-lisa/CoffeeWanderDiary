# PixiJS 迁移说明

本项目已从原生 Canvas 2D API 迁移到 PixiJS 渲染引擎，并使用 npm + Vite 构建。

## 主要变更

### 1. 包管理方式

- **之前**: 手动下载 `pixi.min.js` 放入 `libs/` 目录
- **现在**: 使用 npm 管理依赖，`npm install` 自动安装

### 2. 构建工具

- **之前**: 直接运行，无构建步骤
- **现在**: 使用 Vite 作为构建工具

### 3. 文件结构变化

```
项目根目录
├── package.json          # npm 配置（新增 vite 脚本）
├── vite.config.js        # Vite 配置文件（新增）
├── libs/
│   ├── weapp-adapter/    # 微信小游戏适配器（保留）
│   └── pixi.min.js       # 已删除（使用 npm 包）
│   └── pixiAdapter.js    # 已删除（使用 npm 包）
└── managers/
    └── pixiManager.js    # 更新为 npm 导入方式
```

## 使用方式

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

构建后的文件将输出到 `dist/` 目录。

## 代码变更

### pixiManager.js 导入方式

**之前:**
```javascript
require('../libs/weapp-adapter/weapp-adapter.js')

// 加载真正的 PixiJS，如果不成功则使用适配器
try {
  require('../libs/pixi.min.js')
  let PIXI = null
  if (typeof global !== 'undefined' && global.PIXI) {
    PIXI = global.PIXI
  } else if (typeof window !== 'undefined' && window.PIXI) {
    PIXI = window.PIXI
  }
  // ...
} catch (e) {
  require('../libs/pixiAdapter')
}
```

**现在:**
```javascript
require('../libs/weapp-adapter/weapp-adapter.js')

// 导入 PixiJS - 支持多种导入方式
let PIXI

try {
  // 方式1: 尝试从 npm 包导入（适用于 Vite 构建后的环境）
  PIXI = require('pixi.js')
  console.log('PixiJS loaded via npm, version:', PIXI.VERSION || 'unknown')
} catch (e) {
  // 方式2: 尝试从全局变量获取（适用于开发环境）
  if (typeof global !== 'undefined' && global.PIXI) {
    PIXI = global.PIXI
  } else if (typeof window !== 'undefined' && window.PIXI) {
    PIXI = window.PIXI
  } else if (typeof GameGlobal !== 'undefined' && GameGlobal.PIXI) {
    PIXI = GameGlobal.PIXI
  }
}
```

## 关于 Vite 构建

### 当前限制

由于微信小游戏环境的特殊性，Vite 的 lib 模式在打包 CommonJS 模块时，默认会将 `node_modules` 中的依赖视为外部依赖。这导致 `pixi.js` 不会被自动打包到输出文件中。

### 解决方案

#### 方案1: 开发环境直接使用 npm（推荐）

在微信开发者工具中，可以使用以下方式让代码正常工作：

1. 安装依赖：`npm install`
2. 在项目设置中启用 "增强编译"
3. 微信开发者工具会自动处理 npm 依赖

#### 方案2: 手动打包 PixiJS

如果需要将 PixiJS 打包到单个文件中，可以：

1. 创建一个单独的入口文件 `pixi-entry.js`：
```javascript
const PIXI = require('pixi.js')
if (typeof global !== 'undefined') global.PIXI = PIXI
if (typeof window !== 'undefined') window.PIXI = PIXI
if (typeof GameGlobal !== 'undefined') GameGlobal.PIXI = PIXI
module.exports = PIXI
```

2. 使用 Vite 打包 PixiJS：
```javascript
// vite.pixi.config.js
export default {
  build: {
    lib: {
      entry: './pixi-entry.js',
      name: 'PIXI',
      formats: ['cjs'],
      fileName: () => 'pixi.bundle.js'
    },
    outDir: 'libs'
  }
}
```

3. 在 `pixiManager.js` 中优先加载打包后的文件

#### 方案3: 使用微信开发者工具的 npm 支持

微信开发者工具本身支持 npm 模块：

1. 安装依赖：`npm install`
2. 在开发者工具菜单中选择 "工具" -> "构建 npm"
3. 代码中直接使用 `require('pixi.js')`

## 渲染架构

PixiJS 使用分层渲染架构：

```
Stage (根容器)
├── background (背景层)
├── game (游戏层)
├── ui (UI层)
├── modal (弹窗层)
└── overlay (遮罩层)
```

## API 变更

### 绘图函数

| Canvas 2D | PixiJS |
|-----------|--------|
| `ctx.fillRect()` | `graphics.beginFill(color).drawRect().endFill()` |
| `ctx.strokeRect()` | `graphics.lineStyle().drawRect()` |
| `ctx.fillText()` | `new PIXI.Text(text, style)` |
| `ctx.drawImage()` | `new PIXI.Sprite(texture)` |
| `ctx.beginPath()` | `graphics.beginFill()` |
| `ctx.clip()` | `container.mask = graphics` |

### 颜色格式

- Canvas 2D: `'#FF5733'` 或 `'rgba(255, 87, 51, 0.5)'`
- PixiJS: `0xFF5733` 或 `graphics.beginFill(0xFF5733, 0.5)`

## 像素艺术优化

PixiJS 默认启用像素艺术模式：
```javascript
PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST
```

## 纹理缓存

PixiJS 管理器会自动缓存加载的纹理：
```javascript
const texture = await pixiManager.loadTexture('path/to/image.png')
const sprite = pixiManager.createSprite(texture)
```

## 注意事项

1. **PixiJS 版本**: 使用 8.17.1 版本（通过 npm 管理）
2. **WebGL 支持**: 优先使用 WebGL，如不支持则回退到 Canvas
3. **DPR 处理**: 自动处理设备像素比
4. **内存管理**: 使用 `pixiManager.clearAllLayers()` 清理渲染内容

## 调试

在控制台查看 PixiJS 初始化状态：
```javascript
console.log(pixiManager.initialized)  // true/false
console.log(pixiManager.app)          // Application 实例
```

## Vite 配置说明

`vite.config.js` 主要配置：

- **输出格式**: CommonJS (`cjs`)，适配微信小游戏
- **Source Map**: 启用，便于调试
- **路径别名**: 支持 `@/`, `@managers/`, `@ui/` 等快捷导入
- **依赖优化**: 自动优化 `pixi.js` 依赖
