// pixi-wrapper.js - 包装 PixiJS 确保它被正确打包

// 导入 PixiJS
import * as PIXI from 'pixi.js'

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

// 同时导出 PIXI 供 ESM 使用
export { PIXI }
export default PIXI
