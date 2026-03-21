// game-entry.js - 游戏入口文件

// 2. 加载 PixiJS 包装器（ESM 语法，确保被打包）
import './pixi-wrapper.js'

// 3. 应用微信小游戏 DOM Polyfill（必须在 wechat-adapter 加载后执行）
// DOMPipe 会使用 document.createElement('div') 创建元素并调用 remove()

// 获取 wechat-adapter 创建的 HTMLElement 类
var weappHTMLElement = typeof HTMLElement !== 'undefined' ? HTMLElement : null

if (weappHTMLElement && !weappHTMLElement.prototype.remove) {
  weappHTMLElement.prototype.remove = function() {
    if (this.parentNode && this.parentNode.removeChild) {
      this.parentNode.removeChild(this)
    }
  }
  console.log('[game-entry] Applied remove() polyfill to HTMLElement')
}

// 同时确保 Element 类也有 remove 方法
var weappElement = typeof Element !== 'undefined' ? Element : null
if (weappElement && !weappElement.prototype.remove) {
  weappElement.prototype.remove = function() {
    if (this.parentNode && this.parentNode.removeChild) {
      this.parentNode.removeChild(this)
    }
  }
}

// 为 Node 类也添加 remove 方法（wechat-adapter 的继承链：EventTarget -> Node -> Element -> HTMLElement）
var weappNode = typeof Node !== 'undefined' ? Node : null
if (weappNode && !weappNode.prototype.remove) {
  weappNode.prototype.remove = function() {
    if (this.parentNode && this.parentNode.removeChild) {
      this.parentNode.removeChild(this)
    }
  }
}

// 4. 加载游戏主逻辑
import './game-main.js'

console.log('Game entry loaded')
