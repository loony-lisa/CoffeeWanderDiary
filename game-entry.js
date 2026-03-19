// game-entry.js - 游戏入口文件

// 1. 先加载 PixiJS 包装器（ESM 语法，确保被打包）
import './pixi-wrapper.js'

// 2. 加载微信小游戏适配器
import './libs/weapp-adapter/weapp-adapter.js'

// 3. 加载游戏主逻辑
import './game-main.js'

console.log('Game entry loaded')
