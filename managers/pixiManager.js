// managers/pixiManager.js - PixiJS Manager for WeChat Mini Game
// Handles PixiJS initialization and provides drawing utilities

// 加载微信小游戏适配器
require('../libs/weapp-adapter/weapp-adapter.js')

// ===== 微信小游戏环境 Polyfill =====
// 必须在 weapp-adapter 加载后执行，为其 HTMLElement 类添加 remove() 方法
// DOMPipe 会使用 document.createElement('div') 创建元素并调用 remove()

// 获取 weapp-adapter 创建的 HTMLElement 类
var weappHTMLElement = typeof HTMLElement !== 'undefined' ? HTMLElement : null

if (weappHTMLElement && !weappHTMLElement.prototype.remove) {
  weappHTMLElement.prototype.remove = function() {
    if (this.parentNode && this.parentNode.removeChild) {
      this.parentNode.removeChild(this)
    }
  }
  console.log('[PixiManager] Applied remove() polyfill to HTMLElement')
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

// 为 Node 类也添加 remove 方法（weapp-adapter 的继承链：EventTarget -> Node -> Element -> HTMLElement）
var weappNode = typeof Node !== 'undefined' ? Node : null
if (weappNode && !weappNode.prototype.remove) {
  weappNode.prototype.remove = function() {
    if (this.parentNode && this.parentNode.removeChild) {
      this.parentNode.removeChild(this)
    }
  }
}

// 导入 PixiJS - 优先从全局变量获取（确保使用已打 unsafe-eval 补丁的实例）
let PIXI

// 方式1: 从全局变量获取（优先，确保使用 pixi-wrapper.js 中已打补丁的实例）
if (typeof global !== 'undefined' && global.PIXI) {
  PIXI = global.PIXI
  console.log('PixiJS loaded from global, version:', PIXI.VERSION || 'unknown')
} else if (typeof window !== 'undefined' && window.PIXI) {
  PIXI = window.PIXI
  console.log('PixiJS loaded from window, version:', PIXI.VERSION || 'unknown')
} else if (typeof GameGlobal !== 'undefined' && GameGlobal.PIXI) {
  PIXI = GameGlobal.PIXI
  console.log('PixiJS loaded from GameGlobal, version:', PIXI.VERSION || 'unknown')
} else {
  // 方式2: 尝试从 npm 包导入（备用）
  try {
    PIXI = require('pixi.js')
    console.warn('PixiJS loaded via npm (fallback), unsafe-eval patch may not be applied!')
  } catch (e) {
    console.error('Failed to load PixiJS: not found in npm or global scope')
    throw new Error('PixiJS is required but not found')
  }
}

class PixiManager {
  constructor() {
    this.app = null
    this.stage = null
    this.screenWidth = 0
    this.screenHeight = 0
    this.dpr = 1
    this.initialized = false
    
    // Container for UI layers
    this.layers = {
      background: null,
      game: null,
      ui: null,
      modal: null,
      overlay: null
    }
    
    // Texture cache
    this.textureCache = new Map()
  }

  // Initialize PixiJS application
  async init() {
    if (this.initialized) return true
    
    // Get system info
    const sysInfo = wx.getSystemInfoSync()
    this.screenWidth = sysInfo.windowWidth
    this.screenHeight = sysInfo.windowHeight
    this.dpr = Math.max(1, Math.floor(sysInfo.pixelRatio || 1))
    
    console.log(`PixiJS init: ${this.screenWidth}x${this.screenHeight}, DPR=${this.dpr}`)
    
    try {
      // Create canvas
      const canvas = wx.createCanvas()
      
      // Create PixiJS Application using the new v8 API
      this.app = new PIXI.Application()
      
      // Initialize with options (new v8 API)
      // 不强制使用 Canvas，让 PixiJS 自动选择 WebGL 或 Canvas
      await this.app.init({
        canvas: canvas,
        width: this.screenWidth,
        height: this.screenHeight,
        resolution: this.dpr,
        autoDensity: true,
        backgroundColor: 0x000000,
        antialias: false,
                // 禁用 DOMPipe，避免微信小游戏环境中 remove() 方法不兼容的问题
        dom: false
      })
      
      this.stage = this.app.stage
      
      // Create layer containers
      this.createLayers()
      
      // Enable pixel art mode (PixiJS v8 API)
      // v8 中使用 TextureSource.defaultOptions 设置默认缩放模式
      if (PIXI.TextureSource && PIXI.TextureSource.defaultOptions) {
        PIXI.TextureSource.defaultOptions.scaleMode = 'nearest'
      } else if (PIXI.BaseTexture && PIXI.BaseTexture.defaultOptions) {
        // 兼容旧版本
        PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES?.NEAREST || 'nearest'
      }
      
      this.initialized = true
      console.log('PixiJS initialized successfully')
      return true
      
    } catch (error) {
      console.error('Failed to initialize PixiJS:', error)
      return false
    }
  }

  // Create layer containers
  createLayers() {
    this.layers.background = new PIXI.Container()
    this.layers.game = new PIXI.Container()
    this.layers.ui = new PIXI.Container()
    this.layers.modal = new PIXI.Container()
    this.layers.overlay = new PIXI.Container()
    
    // Add to stage in order (background first)
    this.stage.addChild(this.layers.background)
    this.stage.addChild(this.layers.game)
    this.stage.addChild(this.layers.ui)
    this.stage.addChild(this.layers.modal)
    this.stage.addChild(this.layers.overlay)
  }

  // Get PIXI global
  getPIXI() {
    return PIXI
  }

  // Get application
  getApp() {
    return this.app
  }

  // Get stage
  getStage() {
    return this.stage
  }

  // Get specific layer
  getLayer(name) {
    return this.layers[name] || null
  }

  // Clear a layer
  clearLayer(name) {
    const layer = this.layers[name]
    if (layer) {
      layer.removeChildren()
    }
  }

  // Clear all layers
  clearAllLayers() {
    Object.keys(this.layers).forEach(key => {
      this.clearLayer(key)
    })
  }

  // Create a graphics object
  createGraphics() {
    return new PIXI.Graphics()
  }

  // Create text
  createText(text, style = {}) {
    const defaultStyle = {
      fontFamily: 'sans-serif',
      fontSize: 16,
      fill: 0x000000,
      align: 'center'
    }
    // PixiJS v8: 使用新的构造函数格式 new Text({ text, style })
    return new PIXI.Text({ text, style: { ...defaultStyle, ...style } })
  }

  // Create sprite from texture
  createSprite(texture) {
    return new PIXI.Sprite(texture)
  }

  // Load texture from image path
  async loadTexture(path) {
    // Check cache first
    if (this.textureCache.has(path)) {
      return this.textureCache.get(path)
    }
    
    return new Promise((resolve, reject) => {
      const img = wx.createImage()
      img.onload = () => {
        // PixiJS v8: 使用 TextureSource 直接创建纹理
        // 微信小游戏的 Image 对象不是标准 HTMLImageElement，需要手动创建 TextureSource
        const textureSource = new PIXI.TextureSource({
          resource: img,
          scaleMode: 'nearest',
          autoGarbageCollect: true
        })
        const texture = new PIXI.Texture({ source: textureSource })
        this.textureCache.set(path, texture)
        resolve(texture)
      }
      img.onerror = (err) => {
        reject(err)
      }
      img.src = path
    })
  }

  // Draw rectangle (adds to graphics)
  drawRect(graphics, x, y, width, height, color, alpha = 1) {
    // PixiJS v8: 使用 fill 替代 beginFill/endFill
    graphics.rect(x, y, width, height)
    graphics.fill({ color, alpha })
    return graphics
  }

  // Draw rounded rectangle
  drawRoundedRect(graphics, x, y, width, height, radius, color, alpha = 1) {
    // PixiJS v8: 使用 roundRect 替代 drawRoundedRect，使用 fill 替代 beginFill/endFill
    graphics.roundRect(x, y, width, height, radius)
    graphics.fill({ color, alpha })
    return graphics
  }

  // Draw circle
  drawCircle(graphics, x, y, radius, color, alpha = 1) {
    // PixiJS v8: 使用 fill 替代 beginFill/endFill
    graphics.circle(x, y, radius)
    graphics.fill({ color, alpha })
    return graphics
  }

  // Draw line
  drawLine(graphics, x1, y1, x2, y2, color, width = 1) {
    // PixiJS v8: 使用 stroke 替代 lineStyle
    graphics.moveTo(x1, y1)
    graphics.lineTo(x2, y2)
    graphics.stroke({ color, width })
    return graphics
  }

  // Draw rectangle border
  drawBorder(graphics, x, y, width, height, color, lineWidth = 1) {
    // PixiJS v8: 使用 stroke 替代 lineStyle
    graphics.rect(x, y, width, height)
    graphics.stroke({ color, width: lineWidth })
    return graphics
  }

  // Create button
  createButton(x, y, width, height, text, color, textColor = 0xFFFFFF, callback = null) {
    const container = new PIXI.Container()
    
    // Background
    const bg = this.createGraphics()
    this.drawRect(bg, 0, 0, width, height, color)
    
    // Text
    const label = this.createText(text, {
      fontSize: 14,
      fontWeight: 'bold',
      fill: textColor
    })
    label.anchor.set(0.5)
    label.x = width / 2
    label.y = height / 2
    
    container.addChild(bg)
    container.addChild(label)
    container.x = x
    container.y = y
    
    // Store dimensions for hit testing
    container.hitArea = new PIXI.Rectangle(0, 0, width, height)
    container.buttonData = { x, y, width, height, text }
    
    // Make interactive
    container.eventMode = 'static'
    container.cursor = 'pointer'
    
    if (callback) {
      container.on('pointerdown', callback)
    }
    
    return container
  }

  // Check if point is inside rectangle
  hitTest(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height
  }

  // Convert hex color to number
  hex(color) {
    if (typeof color === 'number') return color
    if (typeof color === 'string') {
      // Remove # if present
      const hex = color.replace('#', '')
      return parseInt(hex, 16)
    }
    return 0x000000
  }

  // Destroy and cleanup
  destroy() {
    if (this.app) {
      this.app.destroy(true)
      this.app = null
    }
    this.textureCache.clear()
    this.initialized = false
  }
}

// Export singleton
const pixiManager = new PixiManager()

module.exports = { PixiManager, pixiManager }
