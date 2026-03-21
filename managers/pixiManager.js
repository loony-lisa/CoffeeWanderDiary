// managers/pixiManager.js - PixiJS Manager for WeChat Mini Game
// 使用 PixiJS v6 API

// ===== 微信小游戏环境 Polyfill =====
// 注意：@iro/wechat-adapter 已在 game-entry.js 中通过 ESM 导入并执行
var weappHTMLElement = typeof HTMLElement !== 'undefined' ? HTMLElement : null
if (weappHTMLElement && !weappHTMLElement.prototype.remove) {
  weappHTMLElement.prototype.remove = function() {
    if (this.parentNode && this.parentNode.removeChild) {
      this.parentNode.removeChild(this)
    }
  }
}

var weappElement = typeof Element !== 'undefined' ? Element : null
if (weappElement && !weappElement.prototype.remove) {
  weappElement.prototype.remove = function() {
    if (this.parentNode && this.parentNode.removeChild) {
      this.parentNode.removeChild(this)
    }
  }
}

var weappNode = typeof Node !== 'undefined' ? Node : null
if (weappNode && !weappNode.prototype.remove) {
  weappNode.prototype.remove = function() {
    if (this.parentNode && this.parentNode.removeChild) {
      this.parentNode.removeChild(this)
    }
  }
}

// 获取 PixiJS（从全局变量，由 pixi-wrapper.js 设置）
let PIXI

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
  console.error('PixiJS not found in global scope')
  throw new Error('PixiJS is required but not found. Make sure pixi-wrapper.js is loaded first.')
}

// ===== 修复微信小游戏 Canvas 识别问题 =====
// PixiJS 的 CanvasResource.test 使用 instanceof HTMLCanvasElement 检测
// 但微信小游戏的 Canvas 不是标准的 HTMLCanvasElement，需要特殊处理

// 方法1: 修改 ADAPTER.createCanvas 使用 document.createElement
if (PIXI && PIXI.settings && PIXI.settings.ADAPTER) {
  const originalCreateCanvas = PIXI.settings.ADAPTER.createCanvas
  PIXI.settings.ADAPTER.createCanvas = function(width, height) {
    // 使用 document.createElement 创建 Canvas，这样会被 wechat-adapter 处理
    if (typeof document !== 'undefined' && document.createElement) {
      const canvas = document.createElement('canvas')
      canvas.width = width || 1
      canvas.height = height || 1
      
      // 确保 canvas 有 style 属性（PixiJS resize 方法需要）
      if (!canvas.style) {
        canvas.style = {}
      }
      canvas.style.width = canvas.width + 'px'
      canvas.style.height = canvas.height + 'px'
      
      return canvas
    }
    // 降级到原始方法
    return originalCreateCanvas(width, height)
  }
}

// 方法2: 注册自定义 CanvasResource 检测器
if (PIXI && PIXI.resources && PIXI.resources.CanvasResource) {
  const originalTest = PIXI.resources.CanvasResource.test
  PIXI.resources.CanvasResource.test = function(source) {
    // 原始检测
    if (originalTest && originalTest(source)) {
      return true
    }
    // 微信小游戏 Canvas 检测
    // 微信 Canvas 有 type 属性且值为 'canvas'
    if (source && source.type === 'canvas' && typeof source.getContext === 'function') {
      return true
    }
    // 检查是否有 getContext 方法（Canvas 的特征）
    if (source && typeof source.getContext === 'function') {
      return true
    }
    return false
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
    
    this.layers = {
      background: null,
      game: null,
      ui: null,
      modal: null,
      overlay: null
    }
    
    this.textureCache = new Map()
    this.maxTextureCacheSize = 50  // 限制纹理缓存大小
  }

  async init() {
    if (this.initialized) return true
    
    const sysInfo = wx.getSystemInfoSync()
    this.screenWidth = sysInfo.windowWidth
    this.screenHeight = sysInfo.windowHeight
    this.dpr = Math.max(1, Math.floor(sysInfo.pixelRatio || 1))
    
    console.log(`PixiJS init: ${this.screenWidth}x${this.screenHeight}, DPR=${this.dpr}`)
    console.log('System info:', JSON.stringify({
      brand: sysInfo.brand,
      model: sysInfo.model,
      system: sysInfo.system,
      platform: sysInfo.platform,
      version: sysInfo.version,
      SDKVersion: sysInfo.SDKVersion
    }))
    
    try {
      // 确保 Canvas 有 addEventListener 方法（PixiJS 需要）
      if (!canvas.addEventListener) {
        if (typeof document !== 'undefined' && document.addEventListener) {
          canvas.addEventListener = document.addEventListener.bind(document)
          canvas.removeEventListener = document.removeEventListener.bind(document)
        } else if (typeof window !== 'undefined' && window.addEventListener) {
          canvas.addEventListener = window.addEventListener.bind(window)
          canvas.removeEventListener = window.removeEventListener.bind(window)
        }
      }
      
      // PixiJS v6 API: 使用 Application 构造函数
      // 关键配置：微信小游戏 WebGL 渲染需要这些参数
      const appOptions = {
        view: canvas,
        width: this.screenWidth,
        height: this.screenHeight,
        resolution: this.dpr,
        autoDensity: true,
        backgroundColor: 0x87CEEB,
        antialias: false,
        forceCanvas: false,  // 强制使用 WebGL
        preserveDrawingBuffer: true,  // 微信小游戏需要
        powerPreference: 'high-performance'  // 请求高性能 GPU
      }
      
      console.log('Creating PixiJS Application with options:', JSON.stringify({
        width: appOptions.width,
        height: appOptions.height,
        resolution: appOptions.resolution,
        forceCanvas: appOptions.forceCanvas,
        preserveDrawingBuffer: appOptions.preserveDrawingBuffer
      }))
      
      this.app = new PIXI.Application(appOptions)
      
      this.stage = this.app.stage
      
      this.createLayers()
      
      // 设置像素艺术模式 (PixiJS v6 API)
      if (PIXI.BaseTexture.defaultOptions) {
        PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST
      } else if (PIXI.settings) {
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST
      }
      
      this.initialized = true
      
      // 监听 WebGL 上下文丢失事件
      const rendererGl = this.app.renderer.gl
      if (rendererGl) {
        canvas.addEventListener('webglcontextlost', (e) => {
          console.error('WebGL context lost!', e)
          e.preventDefault()
        }, false)
      }
      return true
      
    } catch (error) {
      console.error('Failed to initialize PixiJS:', error)
      return false
    }
  }

  createLayers() {
    this.layers.background = new PIXI.Container()
    this.layers.game = new PIXI.Container()
    this.layers.ui = new PIXI.Container()
    this.layers.modal = new PIXI.Container()
    this.layers.overlay = new PIXI.Container()
    
    this.stage.addChild(this.layers.background)
    this.stage.addChild(this.layers.game)
    this.stage.addChild(this.layers.ui)
    this.stage.addChild(this.layers.modal)
    this.stage.addChild(this.layers.overlay)
  }

  getPIXI() {
    return PIXI
  }

  getApp() {
    return this.app
  }

  getStage() {
    return this.stage
  }

  getLayer(name) {
    return this.layers[name] || null
  }

  clearLayer(name) {
    const layer = this.layers[name]
    if (layer) {
      // 正确销毁所有子元素，释放内存
      for (let i = layer.children.length - 1; i >= 0; i--) {
        const child = layer.children[i]
        if (child && !child._destroyed) {
          child.destroy({ children: true, texture: false, baseTexture: false })
        }
      }
      layer.removeChildren()
    }
  }

  clearAllLayers() {
    Object.keys(this.layers).forEach(key => {
      this.clearLayer(key)
    })
  }

  createGraphics() {
    return new PIXI.Graphics()
  }

  createText(text, style = {}) {
    const defaultStyle = {
      fontFamily: 'sans-serif',
      fontSize: 16,
      fill: 0x000000,
      align: 'center'
    }
    return new PIXI.Text(text, { ...defaultStyle, ...style })
  }

  createSprite(texture) {
    return new PIXI.Sprite(texture)
  }

  // 获取下一个 2 的幂次方
  getNextPowerOfTwo(n) {
    if (n <= 1) return 1
    if ((n & (n - 1)) === 0) return n // 已经是 2 的幂次方
    return Math.pow(2, Math.ceil(Math.log2(n)))
  }

  async loadTexture(path) {
    if (this.textureCache.has(path)) {
      return this.textureCache.get(path)
    }
    
    // 限制缓存大小，避免内存无限增长
    if (this.textureCache.size >= this.maxTextureCacheSize) {
      const firstKey = this.textureCache.keys().next().value
      const oldTexture = this.textureCache.get(firstKey)
      if (oldTexture && !oldTexture._destroyed) {
        oldTexture.destroy(true)
      }
      this.textureCache.delete(firstKey)
      console.log(`Texture cache full, removed: ${firstKey}`)
    }
    
    return new Promise((resolve, reject) => {
      const img = wx.createImage()
      img.onload = () => {
        try {
          // 微信图片对象需要特殊处理
          // 创建一个 canvas 并将图片绘制到上面，然后使用 canvas 创建纹理
          const canvas = wx.createCanvas()
          
          // 将 canvas 尺寸调整为 2 的幂次方，避免 WebGL NPOT 纹理限制
          const origWidth = img.width || 1
          const origHeight = img.height || 1
          canvas.width = this.getNextPowerOfTwo(origWidth)
          canvas.height = this.getNextPowerOfTwo(origHeight)
          
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          
          // 使用 canvas 创建 BaseTexture，设置 wrapMode 为 CLAMP 以支持 NPOT 纹理
          const baseTexture = new PIXI.BaseTexture(canvas, {
            scaleMode: PIXI.SCALE_MODES.NEAREST,
            wrapMode: PIXI.WRAP_MODES.CLAMP
          })
          
          // 创建纹理，使用原始尺寸作为 frame
          const texture = new PIXI.Texture(
            baseTexture,
            new PIXI.Rectangle(0, 0, origWidth, origHeight)
          )
          
          this.textureCache.set(path, texture)
          resolve(texture)
        } catch (error) {
          console.error('Error creating texture from image:', error)
          reject(error)
        }
      }
      img.onerror = (err) => {
        reject(err)
      }
      img.src = path
    })
  }

  drawRect(graphics, x, y, width, height, color, alpha = 1) {
    graphics.beginFill(color, alpha)
    graphics.drawRect(x, y, width, height)
    graphics.endFill()
    return graphics
  }

  drawRoundedRect(graphics, x, y, width, height, radius, color, alpha = 1) {
    graphics.beginFill(color, alpha)
    graphics.drawRoundedRect(x, y, width, height, radius)
    graphics.endFill()
    return graphics
  }

  drawCircle(graphics, x, y, radius, color, alpha = 1) {
    graphics.beginFill(color, alpha)
    graphics.drawCircle(x, y, radius)
    graphics.endFill()
    return graphics
  }

  drawLine(graphics, x1, y1, x2, y2, color, width = 1) {
    graphics.lineStyle(width, color)
    graphics.moveTo(x1, y1)
    graphics.lineTo(x2, y2)
    return graphics
  }

  drawBorder(graphics, x, y, width, height, color, lineWidth = 1) {
    graphics.lineStyle(lineWidth, color)
    graphics.drawRect(x, y, width, height)
    return graphics
  }

  createButton(x, y, width, height, text, color, textColor = 0xFFFFFF, callback = null) {
    const container = new PIXI.Container()
    
    const bg = this.createGraphics()
    this.drawRect(bg, 0, 0, width, height, color)
    
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
    
    container.hitArea = new PIXI.Rectangle(0, 0, width, height)
    container.buttonData = { x, y, width, height, text }
    
    // PixiJS v6 API: 使用 interactive 而不是 eventMode
    container.interactive = true
    container.buttonMode = true
    
    if (callback) {
      container.on('pointerdown', callback)
    }
    
    return container
  }

  hitTest(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height
  }

  hex(color) {
    if (typeof color === 'number') return color
    if (typeof color === 'string') {
      const hex = color.replace('#', '')
      return parseInt(hex, 16)
    }
    return 0x000000
  }

  destroy() {
    if (this.app) {
      this.app.destroy(true)
      this.app = null
    }
    this.textureCache.clear()
    this.initialized = false
  }
}

const pixiManager = new PixiManager()

module.exports = { PixiManager, pixiManager }
