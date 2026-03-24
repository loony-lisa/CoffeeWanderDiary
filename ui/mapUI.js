// ui/mapUI.js - Map UI with directional buttons

const { pixiManager } = require('../managers/pixiManager')

class MapUI {
  constructor(screenWidth, screenHeight) {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    
    // Interface state
    this.visible = false
    
    // UI element positions
    this.uiElements = null
    
    // Image cache
    this.imageCache = new Map()
    
    // Size configuration
    this.config = {
      get modalWidth() { return Math.floor(screenWidth * 0.9) },
      get modalHeight() { return Math.floor(screenHeight * 0.7) },
      get modalX() { return Math.floor(screenWidth * 0.05) },
      get modalY() { return Math.floor(screenHeight * 0.15) }
    }
    
    // Button size
    this.buttonSize = 50
    
    // Callback functions
    this.onDirectionClick = null
    this.onClose = null
  }

  // ========== State Control ==========
  show() {
    console.log('MapUI.show() called')
    this.visible = true
    this.preloadImages()
    return true
  }
  
  hide() {
    console.log('MapUI.hide() called')
    this.visible = false
    this.uiElements = null
    
    // Clean up container
    if (this.container) {
      this.container.children.forEach(child => {
        if (child && !child._destroyed) {
          child.destroy({ children: true, texture: false, baseTexture: false })
        }
      })
      this.container.removeChildren()
      this.container = null
    }
  }
  
  isVisible() {
    return this.visible
  }

  // ========== Set Callbacks ==========
  setOnDirectionClick(callback) {
    this.onDirectionClick = callback
  }
  
  setOnClose(callback) {
    this.onClose = callback
  }

  // ========== Image Loading ==========
  preloadImages() {
    const images = ['map', 'up', 'down', 'left', 'right']
    images.forEach(name => this.loadImage(name))
  }
  
  loadImage(name) {
    if (this.imageCache.has(name)) return
    
    const path = name === 'map' 
      ? 'data/sprites/map.png' 
      : `data/sprites/icons/${name}.png`
    
    const cacheEntry = {
      texture: null,
      loaded: false,
      error: false
    }
    this.imageCache.set(name, cacheEntry)
    
    const img = wx.createImage()
    img.onload = () => {
      try {
        const PIXI = pixiManager.getPIXI()
        
        // Create canvas with power-of-two dimensions
        const canvas = wx.createCanvas()
        const origWidth = img.width || 1
        const origHeight = img.height || 1
        canvas.width = this.getNextPowerOfTwo(origWidth)
        canvas.height = this.getNextPowerOfTwo(origHeight)
        
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        
        // Create texture
        const baseTexture = new PIXI.BaseTexture(canvas, {
          scaleMode: PIXI.SCALE_MODES.NEAREST,
          wrapMode: PIXI.WRAP_MODES.CLAMP
        })
        
        const texture = new PIXI.Texture(
          baseTexture,
          new PIXI.Rectangle(0, 0, origWidth, origHeight)
        )
        
        cacheEntry.texture = texture
        cacheEntry.loaded = true
        console.log(`Image loaded: ${name} (${origWidth}x${origHeight})`)
      } catch (e) {
        cacheEntry.error = true
        console.warn(`Failed to create texture for: ${name}`, e)
      }
    }
    img.onerror = () => {
      cacheEntry.error = true
      console.log(`Failed to load image: ${path}`)
    }
    img.src = path
  }
  
  getNextPowerOfTwo(n) {
    if (n <= 1) return 1
    if ((n & (n - 1)) === 0) return n
    return Math.pow(2, Math.ceil(Math.log2(n)))
  }
  
  drawImage(pixi, container, name, x, y, width, height) {
    const cached = this.imageCache.get(name)
    if (cached && cached.texture) {
      const sprite = pixi.createSprite(cached.texture)
      sprite.x = x
      sprite.y = y
      sprite.width = width
      sprite.height = height
      container.addChild(sprite)
      return true
    }
    
    if (cached && cached.error) {
      // Draw placeholder with name
      this.drawPlaceholder(pixi, container, x, y, width, height, name)
      return false
    }
    
    if (!cached) {
      this.loadImage(name)
    }
    
    // Draw placeholder while loading
    this.drawPlaceholder(pixi, container, x, y, width, height, name)
    return false
  }
  
  drawPlaceholder(pixi, container, x, y, width, height, name) {
    const placeholder = pixi.createGraphics()
    placeholder.lineStyle(1, 0x999999)
    placeholder.beginFill(0xEEEEEE)
    placeholder.drawRect(x, y, width, height)
    placeholder.endFill()
    container.addChild(placeholder)
    
    // Add text label
    const text = pixi.createText(name, {
      fontSize: 12,
      fill: 0x666666
    })
    text.anchor.set(0.5)
    text.x = x + width / 2
    text.y = y + height / 2
    container.addChild(text)
  }

  // ========== Drawing Entry ==========
  draw(pixi) {
    if (!this.visible) return
    
    const layer = pixi.getLayer('modal')
    
    // Reuse or create container
    if (!this.container || this.container._destroyed) {
      this.container = new (pixi.getPIXI().Container)()
    } else {
      this.container.children.forEach(child => {
        if (child && !child._destroyed) {
          child.destroy({ children: true, texture: false, baseTexture: false })
        }
      })
      this.container.removeChildren()
    }
    
    this.drawOverlay(pixi, this.container)
    this.uiElements = this.drawModal(pixi, this.container)
    
    layer.addChild(this.container)
  }

  // Draw overlay
  drawOverlay(pixi, container) {
    const g = pixi.createGraphics()
    g.beginFill(0x000000, 0.6)
    g.drawRect(0, 0, this.screenWidth, this.screenHeight)
    g.endFill()
    container.addChild(g)
  }

  // Draw modal
  drawModal(pixi, container) {
    const { modalX, modalY, modalWidth, modalHeight } = this.config
    
    // White background
    const bg = pixi.createGraphics()
    bg.lineStyle(1, 0xE0E0E0)
    bg.beginFill(0xFFFFFF)
    bg.drawRoundedRect(modalX, modalY, modalWidth, modalHeight, 12)
    bg.endFill()
    container.addChild(bg)
    
    // Title
    this.drawTitle(pixi, container, modalX, modalY, modalWidth)
    
    // Close button
    const closeBtn = this.drawCloseButton(pixi, container, modalX, modalY, modalWidth)
    
    // Map and direction buttons
    const mapArea = this.drawMapWithControls(pixi, container, modalX, modalY, modalWidth, modalHeight)
    
    return {
      closeBtn,
      ...mapArea
    }
  }

  // Draw title
  drawTitle(pixi, container, modalX, modalY, modalWidth) {
    const title = pixi.createText('世界地图', {
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0x333333
    })
    title.anchor.set(0.5, 0)
    title.x = modalX + modalWidth / 2
    title.y = modalY + 15
    container.addChild(title)
  }

  // Draw close button
  drawCloseButton(pixi, container, modalX, modalY, modalWidth) {
    const closeBtnX = modalX + modalWidth - 40
    const closeBtnY = modalY + 10
    const size = 30
    
    const closeText = pixi.createText('✕', {
      fontSize: 18,
      fontWeight: 'bold',
      fill: 0xFF6B6B
    })
    closeText.anchor.set(0.5)
    closeText.x = closeBtnX + size / 2
    closeText.y = closeBtnY + size / 2
    
    container.addChild(closeText)
    
    return { x: closeBtnX, y: closeBtnY, width: size, height: size }
  }

  // Draw map with directional controls
  drawMapWithControls(pixi, container, modalX, modalY, modalWidth, modalHeight) {
    const btnSize = this.buttonSize
    const btnGap = 15
    
    // Calculate map area size (leave space for buttons on all sides)
    const mapAreaSize = Math.min(
      modalWidth - btnSize * 2 - btnGap * 4,
      modalHeight - 80 - btnSize * 2 - btnGap * 4
    )
    
    // Center positions
    const centerX = modalX + modalWidth / 2
    const centerY = modalY + 50 + (modalHeight - 80) / 2
    
    // Map position (center)
    const mapX = centerX - mapAreaSize / 2
    const mapY = centerY - mapAreaSize / 2
    
    // Draw map background
    const mapBg = pixi.createGraphics()
    mapBg.lineStyle(2, 0xCCCCCC)
    mapBg.beginFill(0xF5F5F5)
    mapBg.drawRect(mapX, mapY, mapAreaSize, mapAreaSize)
    mapBg.endFill()
    container.addChild(mapBg)
    
    // Draw map image
    this.drawImage(pixi, container, 'map', mapX, mapY, mapAreaSize, mapAreaSize)
    
    // Draw direction buttons
    const buttons = {}
    
    // Up button (above map)
    const upBtnX = centerX - btnSize / 2
    const upBtnY = mapY - btnSize - btnGap
    this.drawDirectionButton(pixi, container, 'up', upBtnX, upBtnY, btnSize)
    buttons.up = { x: upBtnX, y: upBtnY, width: btnSize, height: btnSize, direction: 'up' }
    
    // Down button (below map)
    const downBtnX = centerX - btnSize / 2
    const downBtnY = mapY + mapAreaSize + btnGap
    this.drawDirectionButton(pixi, container, 'down', downBtnX, downBtnY, btnSize)
    buttons.down = { x: downBtnX, y: downBtnY, width: btnSize, height: btnSize, direction: 'down' }
    
    // Left button (left of map)
    const leftBtnX = mapX - btnSize - btnGap
    const leftBtnY = centerY - btnSize / 2
    this.drawDirectionButton(pixi, container, 'left', leftBtnX, leftBtnY, btnSize)
    buttons.left = { x: leftBtnX, y: leftBtnY, width: btnSize, height: btnSize, direction: 'left' }
    
    // Right button (right of map)
    const rightBtnX = mapX + mapAreaSize + btnGap
    const rightBtnY = centerY - btnSize / 2
    this.drawDirectionButton(pixi, container, 'right', rightBtnX, rightBtnY, btnSize)
    buttons.right = { x: rightBtnX, y: rightBtnY, width: btnSize, height: btnSize, direction: 'right' }
    
    return buttons
  }
  
  // Draw a direction button
  drawDirectionButton(pixi, container, direction, x, y, size) {
    // Button background
    const btn = pixi.createGraphics()
    btn.lineStyle(2, 0x3498DB)
    btn.beginFill(0xEBF5FB)
    btn.drawRoundedRect(x, y, size, size, 8)
    btn.endFill()
    container.addChild(btn)
    
    // Draw icon image
    this.drawImage(pixi, container, direction, x + 5, y + 5, size - 10, size - 10)
  }

  // ========== Click Handling ==========
  handleTouch(x, y) {
    if (!this.visible || !this.uiElements) return false
    
    // Check close button
    if (this.isPointInRect(x, y, this.uiElements.closeBtn)) {
      this.hide()
      if (this.onClose) this.onClose()
      return true
    }
    
    // Check direction buttons
    const directions = ['up', 'down', 'left', 'right']
    for (const dir of directions) {
      if (this.isPointInRect(x, y, this.uiElements[dir])) {
        console.log(`Direction clicked: ${dir}`)
        if (this.onDirectionClick) {
          this.onDirectionClick(dir)
        } else {
          // Default behavior: show toast
          wx.showToast({
            title: `向${this.getDirectionText(dir)}移动`,
            icon: 'none'
          })
        }
        return true
      }
    }
    
    // Clicked inside modal (but not on buttons)
    return true
  }
  
  getDirectionText(direction) {
    const texts = {
      up: '上',
      down: '下',
      left: '左',
      right: '右'
    }
    return texts[direction] || direction
  }
  
  isPointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height
  }
}

module.exports = { MapUI }
