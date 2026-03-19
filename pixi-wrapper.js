// pixi-wrapper.js - 包装 PixiJS 确保它被正确打包

// 首先导入 PixiJS
import * as PIXI from 'pixi.js'

// 然后应用 unsafe-eval 补丁（必须在创建渲染器之前导入）
import 'pixi.js/unsafe-eval'

console.log('PixiJS imported with unsafe-eval support, version:', PIXI.VERSION)

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
