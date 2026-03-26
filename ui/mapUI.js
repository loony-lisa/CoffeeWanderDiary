// ui/mapUI.js - Map UI with directional buttons

const { RESOURCES } = require('../config')
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
      get modalHeight() { return Math.floor(screenHeight * 0.8) },
      get modalX() { return Math.floor(screenWidth * 0.05) },
      get modalY() { return Math.floor(screenHeight * 0.1) }
    }
    
    // Map configuration
    this.mapWidth = 256
    this.mapHeight = 256
    this.viewportSize = 32
    this.moveStep = 16
    
    // Viewport position (top-left corner of visible area)
    // Initial: x=192, y=128
    this.viewportX = 192
    this.viewportY = 128
    
    // Button size (smaller for inside map)
    this.buttonSize = 36
    
    // Display scale for map (larger)
    this.displayScale = 6  // 32px -> 192px display
    
    // Current city info
    this.currentCity = '北京'
    this.cityDescription = '北京是中国咖啡文化最蓬勃的城市之一，拥有全国最密集的精品咖啡馆和最多元的咖啡社群，从胡同深处的独立小店到国际连锁品牌，形成了兼具本土特色与国际视野的独特咖啡生态。'
    this.travelCost = 2000
    this.travelTime = '24小时'
    
    // Scroll state for description
    this.descScrollOffset = 0
    this.isDragging = false
    this.dragStartY = 0
    this.dragStartOffset = 0
    
    // Callback functions
    this.onDirectionClick = null
    this.onClose = null
    this.onConfirmTravel = null
    
    // Bind touch events for scrolling
    this.bindTouchEvents()
  }
  
  // Bind touch events for scrolling
  bindTouchEvents() {
    wx.onTouchMove((e) => {
      if (!this.visible || !this.isDragging) return
      
      const touch = e.touches[0]
      const deltaY = this.dragStartY - touch.clientY
      let newOffset = this.dragStartOffset + deltaY
      newOffset = Math.max(0, Math.min(newOffset, this.maxDescScroll))
      this.descScrollOffset = newOffset
    })
    
    wx.onTouchEnd(() => {
      this.isDragging = false
    })
  }

  // ========== State Control ==========
  show() {
    console.log('MapUI.show() called')
    this.visible = true
    // Reset viewport to initial position
    this.viewportX = 192
    this.viewportY = 128
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
  
  setOnConfirmTravel(callback) {
    this.onConfirmTravel = callback
  }
  
  // ========== City Info ==========
  setCurrentCity(city, description, cost, time) {
    this.currentCity = city || this.currentCity
    this.cityDescription = description || this.cityDescription
    this.travelCost = cost !== undefined ? cost : this.travelCost
    this.travelTime = time || this.travelTime
  }

  // ========== Image Loading ==========
  preloadImages() {
    const images = ['map', 'up', 'down', 'left', 'right']
    images.forEach(name => this.loadImage(name))
  }
  
  loadImage(name) {
    if (this.imageCache.has(name)) return
    
    const path = name === 'map' 
      ? RESOURCES.map() 
      : RESOURCES.icon(name)
    
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
    
    // Close button
    const closeBtn = this.drawCloseButton(pixi, container, modalX, modalY, modalWidth)
    
    // Layout from top to bottom
    let currentY = modalY + 15
    
    // 1. Current city label
    this.drawCityLabel(pixi, container, modalX, currentY, modalWidth)
    currentY += 35
    
    // 2. Map with controls inside
    const mapArea = this.drawMapWithControls(pixi, container, modalX, currentY, modalWidth)
    currentY += this.viewportSize * this.displayScale + 20
    
    // 3. City description box (scrollable)
    const descArea = this.drawDescriptionBox(pixi, container, modalX, currentY, modalWidth)
    currentY += 100 + 15
    
    // 4. Travel info and confirm button
    const travelArea = this.drawTravelInfo(pixi, container, modalX, currentY, modalWidth)
    
    return {
      closeBtn,
      ...mapArea,
      descArea,
      ...travelArea
    }
  }

  // Draw current city label
  drawCityLabel(pixi, container, modalX, y, modalWidth) {
    const label = pixi.createText(`当前所在城市：${this.currentCity}`, {
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0x333333
    })
    label.anchor.set(0.5, 0)
    label.x = modalX + modalWidth / 2
    label.y = y
    container.addChild(label)
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

  // Draw map with directional controls (buttons inside map)
  drawMapWithControls(pixi, container, modalX, startY, modalWidth) {
    const btnSize = this.buttonSize
    const displayScale = this.displayScale  // 6x scale
    
    // Display area size (32px * scale)
    const displaySize = this.viewportSize * displayScale
    
    // Center the map
    const mapDisplayX = modalX + (modalWidth - displaySize) / 2
    const mapDisplayY = startY
    
    // Draw map background (dark background for the viewport area)
    const mapBg = pixi.createGraphics()
    mapBg.lineStyle(2, 0x333333)
    mapBg.beginFill(0x1a1a1a)
    mapBg.drawRect(mapDisplayX, mapDisplayY, displaySize, displaySize)
    mapBg.endFill()
    container.addChild(mapBg)
    
    // Draw the visible portion of the map
    this.drawMapViewport(pixi, container, mapDisplayX, mapDisplayY, displaySize, displayScale)
    
    // Draw direction buttons inside the map (at edges)
    const buttons = {}
    const btnMargin = 4  // Margin from map edge
    
    // Up button (top center inside map)
    const upBtnX = mapDisplayX + (displaySize - btnSize) / 2
    const upBtnY = mapDisplayY + btnMargin
    this.drawDirectionButton(pixi, container, 'up', upBtnX, upBtnY, btnSize, 0.7)
    buttons.up = { x: upBtnX, y: upBtnY, width: btnSize, height: btnSize, direction: 'up' }
    
    // Down button (bottom center inside map)
    const downBtnX = mapDisplayX + (displaySize - btnSize) / 2
    const downBtnY = mapDisplayY + displaySize - btnSize - btnMargin
    this.drawDirectionButton(pixi, container, 'down', downBtnX, downBtnY, btnSize, 0.7)
    buttons.down = { x: downBtnX, y: downBtnY, width: btnSize, height: btnSize, direction: 'down' }
    
    // Left button (left center inside map)
    const leftBtnX = mapDisplayX + btnMargin
    const leftBtnY = mapDisplayY + (displaySize - btnSize) / 2
    this.drawDirectionButton(pixi, container, 'left', leftBtnX, leftBtnY, btnSize, 0.7)
    buttons.left = { x: leftBtnX, y: leftBtnY, width: btnSize, height: btnSize, direction: 'left' }
    
    // Right button (right center inside map)
    const rightBtnX = mapDisplayX + displaySize - btnSize - btnMargin
    const rightBtnY = mapDisplayY + (displaySize - btnSize) / 2
    this.drawDirectionButton(pixi, container, 'right', rightBtnX, rightBtnY, btnSize, 0.7)
    buttons.right = { x: rightBtnX, y: rightBtnY, width: btnSize, height: btnSize, direction: 'right' }
    
    return buttons
  }
  
  // Draw the visible portion of the map
  drawMapViewport(pixi, container, displayX, displayY, displaySize, displayScale) {
    const cached = this.imageCache.get('map')
    const PIXI = pixiManager.getPIXI()
    
    if (cached && cached.texture) {
      // Create a container for the map with masking
      const mapContainer = new PIXI.Container()
      mapContainer.x = displayX
      mapContainer.y = displayY
      
      // Create mask for the viewport
      const mask = pixi.createGraphics()
      mask.beginFill(0xFFFFFF)
      mask.drawRect(0, 0, displaySize, displaySize)
      mask.endFill()
      mask.x = displayX
      mask.y = displayY
      
      // Create the map sprite
      const mapSprite = pixi.createSprite(cached.texture)
      
      // Scale the map to display size
      mapSprite.scale.set(displayScale)
      
      // Position the map to show the viewport area
      // viewportX, viewportY is the top-left of visible area in the original map
      mapSprite.x = displayX - this.viewportX * displayScale
      mapSprite.y = displayY - this.viewportY * displayScale
      
      // Apply mask
      mapSprite.mask = mask
      
      container.addChild(mapSprite)
      container.addChild(mask)
    } else {
      // Draw placeholder
      this.drawPlaceholder(pixi, container, displayX, displayY, displaySize, displaySize, 'map')
      
      if (!cached) {
        this.loadImage('map')
      }
    }
  }
  
  // Draw a direction button
  drawDirectionButton(pixi, container, direction, x, y, size, alpha = 1) {
    // Button background (semi-transparent for inside-map placement)
    const btn = pixi.createGraphics()
    btn.lineStyle(1, 0x3498DB, alpha)
    btn.beginFill(0xEBF5FB, 0.85)
    btn.drawRoundedRect(x, y, size, size, 6)
    btn.endFill()
    container.addChild(btn)
    
    // Draw icon image
    this.drawImage(pixi, container, direction, x + 4, y + 4, size - 8, size - 8)
  }
  
  // Draw description box (scrollable)
  drawDescriptionBox(pixi, container, modalX, startY, modalWidth) {
    const boxHeight = 100
    const padding = 10
    const boxWidth = modalWidth - 30
    const boxX = modalX + 15
    
    // Box background
    const bg = pixi.createGraphics()
    bg.lineStyle(1, 0xDDDDDD)
    bg.beginFill(0xF9F9F9)
    bg.drawRoundedRect(boxX, startY, boxWidth, boxHeight, 8)
    bg.endFill()
    container.addChild(bg)
    
    // Create mask for clipping (inside the box)
    const mask = pixi.createGraphics()
    mask.beginFill(0xFFFFFF)
    mask.drawRect(boxX + padding, startY + padding, boxWidth - padding * 2, boxHeight - padding * 2)
    mask.endFill()
    
    // Text container with mask
    const textContainer = new (pixi.getPIXI().Container)()
    textContainer.mask = mask
    
    // Description text with word wrap
    const textStyle = {
      fontSize: 13,
      fill: 0x555555,
      wordWrap: true,
      wordWrapWidth: boxWidth - padding * 2 - 15, // Leave space for scrollbar
      lineHeight: 20,
      breakWords: true
    }
    
    const descText = pixi.createText(this.cityDescription, textStyle)
    descText.x = boxX + padding
    descText.y = startY + padding - this.descScrollOffset
    textContainer.addChild(descText)
    
    // Calculate max scroll
    const textHeight = descText.height
    const visibleHeight = boxHeight - padding * 2
    this.maxDescScroll = Math.max(0, textHeight - visibleHeight)
    
    container.addChild(textContainer)
    container.addChild(mask)
    
    // Draw scrollbar if needed
    if (this.maxDescScroll > 0) {
      const scrollbarWidth = 4
      const scrollbarHeight = Math.max(20, (visibleHeight / textHeight) * visibleHeight)
      const scrollbarX = boxX + boxWidth - scrollbarWidth - 6
      const maxScrollY = visibleHeight - scrollbarHeight
      const scrollbarY = startY + padding + (this.descScrollOffset / this.maxDescScroll) * maxScrollY
      
      // Scrollbar track
      const track = pixi.createGraphics()
      track.beginFill(0x000000, 0.1)
      track.drawRoundedRect(scrollbarX, startY + padding, scrollbarWidth, visibleHeight, 2)
      track.endFill()
      container.addChild(track)
      
      // Scrollbar thumb
      const thumb = pixi.createGraphics()
      thumb.beginFill(0x000000, 0.3)
      thumb.drawRoundedRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight, 2)
      thumb.endFill()
      container.addChild(thumb)
    }
    
    return {
      descBox: { x: boxX, y: startY, width: boxWidth, height: boxHeight }
    }
  }
  
  // Draw travel info and confirm button
  drawTravelInfo(pixi, container, modalX, startY, modalWidth) {
    const boxHeight = 60
    const padding = 15
    const boxWidth = modalWidth - 30
    const boxX = modalX + 15
    
    // Box background
    const bg = pixi.createGraphics()
    bg.lineStyle(1, 0xDDDDDD)
    bg.beginFill(0xFFF8E7)
    bg.drawRoundedRect(boxX, startY, boxWidth, boxHeight, 8)
    bg.endFill()
    container.addChild(bg)
    
    // Cost info (left side)
    const costText = pixi.createText(`所需花费：${this.travelCost}`, {
      fontSize: 14,
      fill: 0x333333
    })
    costText.x = boxX + padding
    costText.y = startY + 12
    container.addChild(costText)
    
    const timeText = pixi.createText(`所需时间：${this.travelTime}`, {
      fontSize: 14,
      fill: 0x333333
    })
    timeText.x = boxX + padding
    timeText.y = startY + 34
    container.addChild(timeText)
    
    // Confirm button (right side)
    const btnWidth = 90
    const btnHeight = 40
    const btnX = boxX + boxWidth - btnWidth - padding
    const btnY = startY + (boxHeight - btnHeight) / 2
    
    const btn = pixi.createGraphics()
    btn.lineStyle(1, 0x27AE60)
    btn.beginFill(0x27AE60)
    btn.drawRoundedRect(btnX, btnY, btnWidth, btnHeight, 6)
    btn.endFill()
    container.addChild(btn)
    
    const btnText = pixi.createText('确认前往', {
      fontSize: 14,
      fontWeight: 'bold',
      fill: 0xFFFFFF
    })
    btnText.anchor.set(0.5)
    btnText.x = btnX + btnWidth / 2
    btnText.y = btnY + btnHeight / 2
    container.addChild(btnText)
    
    return {
      confirmBtn: { x: btnX, y: btnY, width: btnWidth, height: btnHeight }
    }
  }

  // ========== Movement Control ==========
  moveViewport(direction) {
    let newX = this.viewportX
    let newY = this.viewportY
    
    switch (direction) {
      case 'up':
        // Up button: map moves down (viewport Y decreases)
        newY = this.viewportY - this.moveStep
        break
      case 'down':
        // Down button: map moves up (viewport Y increases)
        newY = this.viewportY + this.moveStep
        break
      case 'left':
        // Left button: map moves right (viewport X decreases)
        newX = this.viewportX - this.moveStep
        break
      case 'right':
        // Right button: map moves left (viewport X increases)
        newX = this.viewportX + this.moveStep
        break
    }
    
    // Check boundaries
    const maxX = this.mapWidth - this.viewportSize
    const maxY = this.mapHeight - this.viewportSize
    
    // Check if hit boundary
    if (newX < 0) {
      wx.showToast({ title: '已到达左边界', icon: 'none' })
      return false
    }
    if (newX > maxX) {
      wx.showToast({ title: '已到达右边界', icon: 'none' })
      return false
    }
    if (newY < 0) {
      wx.showToast({ title: '已到达上边界', icon: 'none' })
      return false
    }
    if (newY > maxY) {
      wx.showToast({ title: '已到达下边界', icon: 'none' })
      return false
    }
    
    // Apply movement
    this.viewportX = newX
    this.viewportY = newY
    console.log(`Viewport moved to: (${this.viewportX}, ${this.viewportY})`)
    return true
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
        
        // Move viewport
        const moved = this.moveViewport(dir)
        
        // Trigger callback if moved
        if (moved && this.onDirectionClick) {
          this.onDirectionClick(dir, this.viewportX, this.viewportY)
        }
        return true
      }
    }
    
    // Check confirm button
    if (this.isPointInRect(x, y, this.uiElements.confirmBtn)) {
      console.log('Confirm travel clicked')
      if (this.onConfirmTravel) {
        this.onConfirmTravel(this.currentCity, this.travelCost, this.travelTime)
      }
      this.hide()
      return true
    }
    
    // Check description box for scrolling
    if (this.uiElements.descArea && this.isPointInRect(x, y, this.uiElements.descBox)) {
      if (this.maxDescScroll > 0) {
        this.isDragging = true
        this.dragStartY = y
        this.dragStartOffset = this.descScrollOffset
      }
      return true
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
