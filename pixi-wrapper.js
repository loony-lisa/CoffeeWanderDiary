// pixi-wrapper.js - 包装 PixiJS 确保它被正确打包

// 1. 先加载微信小游戏适配器（必须在 PixiJS 之前加载，以提供 DOM API polyfill）
import '@iro/wechat-adapter'
// 导入 PixiJS
import * as PIXI from 'pixi.js'
import Interaction from '@iro/interaction'

// 导入并安装 @pixi/unsafe-eval 以支持微信小游戏环境（不支持 unsafe-eval）
// 必须在 PixiJS 加载后、创建 Application 前安装
import { install } from '@pixi/unsafe-eval'
install(PIXI)

console.log('PixiJS imported, version:', PIXI.VERSION)

// 导出到全局变量（供其他 CommonJS 模块使用）
if (typeof global !== 'undefined') {
  global.PIXI = PIXI
}
if (typeof window !== 'undefined') {
  window.PIXI = PIXI
}
if (typeof GameGlobal !== 'undefined') {
  GameGlobal.PIXI = PIXI
}

// pixi.js@6
// remove default interaction extensions
for (const x in PIXI.extensions._queue) {
  // @ts-expect-error
  for (const ext of PIXI.extensions._queue[x]) {
    if (ext.name === 'interaction') {
      PIXI.extensions.remove(ext)
    }
  }
}

// add @iro/interaction
PIXI.extensions.add(
  {
    name: 'interaction',
    ref: Interaction,
    type: [PIXI.ExtensionType.RendererPlugin, PIXI.ExtensionType.CanvasRendererPlugin]
  }
)

console.log('PixiJS interaction added.')

// 同时导出 PIXI 供 ESM 使用
export { PIXI }
export default PIXI
