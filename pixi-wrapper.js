// pixi-wrapper.js - 包装 PixiJS 确保它被正确打包

// ===== 微信小游戏环境 Polyfill =====
// 微信小程序的 DOM 元素没有标准的 remove() 方法，需要 polyfill
if (typeof Element !== 'undefined' && !Element.prototype.remove) {
  Element.prototype.remove = function() {
    if (this.parentNode) {
      this.parentNode.removeChild(this)
    }
  }
}

// 针对微信小游戏环境的额外 polyfill
if (typeof GameGlobal !== 'undefined') {
  // 确保 HTMLElement 也有 remove 方法
  if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.remove) {
    HTMLElement.prototype.remove = function() {
      if (this.parentNode) {
        this.parentNode.removeChild(this)
      }
    }
  }
}

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
