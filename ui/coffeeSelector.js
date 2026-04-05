// ui/coffeeSelector.js - Coffee Selector with PixiJS

const { RESOURCES } = require('../config')
const { cookbookDataManager } = require('./cookbook/cookbookDataManager')
const { pixiManager } = require('../managers/pixiManager')
const { getNextPowerOfTwo } = require('../utils/mathUtils')

class CoffeeSelector {
  constructor(screenWidth, screenHeight) {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    
    // Interface state
    this.visible = false
    
    // Selected coffees (max 3)
    this.selectedCoffees = new Set()
    this.maxSelection = 3
    
    // Scroll state
    this.scrollOffset = 0
    this.maxScrollOffset = 0
    this.isDragging = false
    this.dragStartY = 0
    this.dragStartOffset = 0
    
    // UI element positions
    this.uiElements = null
    
    // Size configuration
    this.config = {
      get modalWidth() { return Math.floor(screenWidth * 0.9) },
      get modalHeight() { return Math.floor(screenHeight * 0.7) },
      get modalX() { return Math.floor(screenWidth * 0.05) },
      get modalY() { return Math.floor(screenHeight * 0.15) },
      itemHeight: 70,
      itemGap: 10,
      itemsPerRow: 3
    }
    
    // Image cache for coffee sprites
    this.imageCache = new Map()
    this.maxImageCacheSize = 30
    this.pendingRedraw = false
    
    // Callback functions
    this.onConfirm = null
    this.onCancel = null
    
    // Bind touch events
    this.bindTouchEvents()
  }

  // ========== Touch Event Binding ==========
  bindTouchEvents() {
    wx.onTouchMove((e) => {
      if (!this.visible || !this.isDragging) return
      
      const touch = e.touches[0]
      const deltaY = this.dragStartY - touch.clientY
      let newOffset = this.dragStartOffset + deltaY
      newOffset = Math.max(0, Math.min(newOffset, this.maxScrollOffset))
      this.scrollOffset = newOffset
    })
    
    wx.onTouchEnd(() => {
      this.isDragging = false
    })
  }

  // ========== State Control ==========
  show() {
    console.log('CoffeeSelector.show() called')
    
    // Get unlocked coffees
    const unlockedCoffees = this.getUnlockedCoffees()
    if (unlockedCoffees.length === 0) {
      wx.showToast({ title: 'No coffee researched yet!', icon: 'none' })
      return false
    }
    
    this.visible = true
    this.selectedCoffees.clear()
    this.scrollOffset = 0
    
    // Preload coffee images
    this.preloadCoffeeImages()
    
    return true
  }
  
  // Load saved menu coffees
  loadSavedSelection(savedCoffees) {
    if (!savedCoffees || savedCoffees.length === 0) return
    
    this.selectedCoffees.clear()
    const unlockedCoffees = this.getUnlockedCoffees()
    const unlockedIds = new Set(unlockedCoffees.map(c => c.id))
    
    // Only add coffees that are still unlocked
    savedCoffees.forEach(coffeeId => {
      if (unlockedIds.has(coffeeId) && this.selectedCoffees.size < this.maxSelection) {
        this.selectedCoffees.add(coffeeId)
      }
    })
    
    console.log('Loaded saved coffee selection:', Array.from(this.selectedCoffees))
  }
  
  hide() {
    console.log('CoffeeSelector.hide() called')
    this.visible = false
    this.uiElements = null
    this.isDragging = false
    
    // 清理 container 释放内存
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
  setOnConfirm(callback) {
    this.onConfirm = callback
  }
  
  setOnCancel(callback) {
    this.onCancel = callback
  }

  // ========== Get Unlocked Coffees ==========
  getUnlockedCoffees() {
    return cookbookDataManager.getItemsByCategory('coffees')
      .filter(coffee => coffee.isUnlocked)
  }

  // ========== Selection Control ==========
  toggleCoffee(coffeeId) {
    if (this.selectedCoffees.has(coffeeId)) {
      this.selectedCoffees.delete(coffeeId)
      return true
    } else {
      if (this.selectedCoffees.size >= this.maxSelection) {
        wx.showToast({ title: `最多只能选择 ${this.maxSelection} 种咖啡`, icon: 'none' })
        return false
      }
      this.selectedCoffees.add(coffeeId)
      return true
    }
  }
  
  getSelectedCount() {
    return this.selectedCoffees.size
  }
  
  getSelectedCoffees() {
    const allCoffees = this.getUnlockedCoffees()
    return allCoffees.filter(coffee => this.selectedCoffees.has(coffee.id))
  }
  
  // Get selected coffee IDs
  getSelectedCoffeeIds() {
    return Array.from(this.selectedCoffees)
  }

  // ========== Image Loading ==========
  preloadCoffeeImages() {
    const coffees = this.getUnlockedCoffees()
    if (!coffees) return
    
    coffees.forEach(coffee => {
      if (!this.imageCache.has(coffee.id)) {
        this.loadCoffeeImage(coffee.id)
      }
    })
  }
  
  loadCoffeeImage(itemId) {
    // 限制缓存大小
    if (this.imageCache.size >= this.maxImageCacheSize) {
      const firstKey = this.imageCache.keys().next().value
      const oldEntry = this.imageCache.get(firstKey)
      if (oldEntry && oldEntry.texture && !oldEntry.texture._destroyed) {
        oldEntry.texture.destroy(true)
      }
      this.imageCache.delete(firstKey)
    }
    
    const imagePath = RESOURCES.coffee(itemId)
    
    const cacheEntry = {
      texture: null,
      loaded: false,
      error: false
    }
    this.imageCache.set(itemId, cacheEntry)
    
    const img = wx.createImage()
    img.onload = () => {
      try {
        const PIXI = pixiManager.getPIXI()
        
        // 将图片绘制到 2 的幂次方尺寸的 canvas 上，避免 WebGL NPOT 纹理限制
        const canvas = wx.createCanvas()
        const origWidth = img.width || 1
        const origHeight = img.height || 1
        canvas.width = getNextPowerOfTwo(origWidth)
        canvas.height = getNextPowerOfTwo(origHeight)
        
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
        
        cacheEntry.texture = texture
        cacheEntry.loaded = true
        this.pendingRedraw = true
        console.log(`Coffee image loaded: ${itemId} (${origWidth}x${origHeight} -> ${canvas.width}x${canvas.height})`)
      } catch (e) {
        cacheEntry.error = true
        console.warn(`Failed to create texture for: ${itemId}`, e)
      }
    }
    img.onerror = () => {
      cacheEntry.error = true
      console.log(`Failed to load coffee image: ${imagePath}`)
    }
    img.src = imagePath
  }
  
  drawCoffeeImage(pixi, container, itemId, x, y, size) {
    // Check cache first
    const cached = this.imageCache.get(itemId)
    if (cached && cached.texture) {
      const sprite = pixi.createSprite(cached.texture)
      sprite.x = x
      sprite.y = y
      sprite.width = size
      sprite.height = size
      container.addChild(sprite)
      return
    }
    
    if (cached && cached.error) {
      this.drawPinkPlaceholder(pixi, container, x, y, size)
      return
    }
    
    if (!cached) {
      this.loadCoffeeImage(itemId)
    }
    
    // Draw placeholder while loading
    this.drawPinkPlaceholder(pixi, container, x, y, size)
  }
  
  drawPinkPlaceholder(pixi, container, x, y, size) {
    const placeholder = pixi.createGraphics()
    placeholder.lineStyle(1, 0xFF69B4)
    placeholder.beginFill(0xFFB6C1)
    placeholder.drawRect(x, y, size, size)
    placeholder.endFill()
    container.addChild(placeholder)
  }

  // Check if any images finished loading and need redraw
  checkPendingRedraw() {
    if (this.pendingRedraw && this.visible) {
      this.pendingRedraw = false
      return true
    }
    return false
  }

  // ========== Drawing Entry ==========
  draw(pixi) {
    if (!this.visible) return
    
    const layer = pixi.getLayer('modal')
    
    // 复用 container 而不是每帧创建新的
    // 检查 container 是否为 null 或已被销毁（可能被 clearAllLayers 销毁）
    if (!this.container || this.container._destroyed) {
      this.container = new (pixi.getPIXI().Container)()
    } else {
      // 清理旧内容，释放内存
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
    bg.drawRect(modalX, modalY, modalWidth, modalHeight)
    bg.endFill()
    
    container.addChild(bg)
    
    // Title
    this.drawTitle(pixi, container, modalX, modalY, modalWidth)
    
    // Close button
    const closeBtn = this.drawCloseButton(pixi, container, modalX, modalY, modalWidth)
    
    // Selected slots (3 empty slots showing selected coffees) - moved above grid
    const slotsArea = this.drawSelectedSlots(pixi, container, modalX, modalY, modalWidth)
    
    // Coffee grid list
    const listArea = this.drawCoffeeGrid(pixi, container, modalX, modalY, modalWidth, modalHeight, slotsArea.y + slotsArea.height)
    
    // Bottom buttons
    const { confirmBtn, cancelBtn } = this.drawBottomButtons(pixi, container, modalX, modalY, modalWidth, modalHeight)
    
    return {
      closeBtn,
      slotsArea,
      listArea,
      confirmBtn,
      cancelBtn
    }
  }

  // Draw title
  drawTitle(pixi, container, modalX, modalY, modalWidth) {
    const title = pixi.createText('选择要售卖的咖啡', {
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

  // Draw selected coffee slots (3 empty slots)
  drawSelectedSlots(pixi, container, modalX, modalY, modalWidth) {
    const slotSize = 50
    const slotGap = 15
    const totalWidth = this.maxSelection * slotSize + (this.maxSelection - 1) * slotGap
    const startX = modalX + (modalWidth - totalWidth) / 2
    const slotsY = modalY + 50
    
    const selectedCoffees = this.getSelectedCoffees()
    const slotPositions = []
    
    for (let i = 0; i < this.maxSelection; i++) {
      const slotX = startX + i * (slotSize + slotGap)
      
      // Slot background (empty or with selected coffee)
      const slotBg = pixi.createGraphics()
      slotBg.lineStyle(2, 0xCCCCCC)
      slotBg.beginFill(0xF5F5F5)
      slotBg.drawRect(slotX, slotsY, slotSize, slotSize)
      slotBg.endFill()
      container.addChild(slotBg)
      
      // If there's a selected coffee for this slot, show its image
      if (selectedCoffees[i]) {
        const coffee = selectedCoffees[i]
        const imageSize = 40
        const imageX = slotX + (slotSize - imageSize) / 2
        const imageY = slotsY + (slotSize - imageSize) / 2
        this.drawCoffeeImage(pixi, container, coffee.id, imageX, imageY, imageSize)
      }
      
      slotPositions.push({
        x: slotX,
        y: slotsY,
        width: slotSize,
        height: slotSize
      })
    }
    
    return {
      x: startX,
      y: slotsY,
      width: totalWidth,
      height: slotSize
    }
  }

  // Draw coffee grid (similar to cookbook grid)
  drawCoffeeGrid(pixi, container, modalX, modalY, modalWidth, modalHeight, gridStartY) {
    const coffees = this.getUnlockedCoffees()
    const { itemHeight, itemGap, itemsPerRow } = this.config
    
    const gridX = modalX + 15
    const gridY = gridStartY + 10
    const gridWidth = modalWidth - 30
    const gridHeight = modalHeight - gridY + modalY - 80
    
    // Grid background
    const gridBg = pixi.createGraphics()
    gridBg.beginFill(0xF5F5F5)
    gridBg.drawRect(gridX, gridY, gridWidth, gridHeight)
    gridBg.endFill()
    container.addChild(gridBg)
    
    // Calculate card size
    const horizontalGap = 10
    const verticalGap = 10
    const cardWidth = (gridWidth - horizontalGap * (itemsPerRow - 1)) / itemsPerRow
    const cardHeight = itemHeight
    
    // Calculate total rows and total height
    const totalRows = Math.ceil(coffees.length / itemsPerRow)
    const contentTotalHeight = totalRows * (cardHeight + verticalGap) - verticalGap
    this.maxScrollOffset = Math.max(0, contentTotalHeight - gridHeight)
    
    // Create mask for clipping
    const mask = pixi.createGraphics()
    mask.beginFill(0xFFFFFF)
    mask.drawRect(gridX, gridY, gridWidth, gridHeight)
    mask.endFill()
    
    const contentContainer = new (pixi.getPIXI().Container)()
    contentContainer.mask = mask
    
    // Draw coffee cards
    const startY = gridY - this.scrollOffset
    const itemPositions = []
    
    coffees.forEach((coffee, index) => {
      const row = Math.floor(index / itemsPerRow)
      const col = index % itemsPerRow
      
      const cardX = gridX + col * (cardWidth + horizontalGap)
      const cardY = startY + row * (cardHeight + verticalGap)
      
      // Only draw visible area
      if (cardY + cardHeight < gridY || cardY > gridY + gridHeight) {
        itemPositions.push({
          id: coffee.id,
          x: cardX,
          y: cardY,
          width: cardWidth,
          height: cardHeight
        })
        return
      }
      
      const isSelected = this.selectedCoffees.has(coffee.id)
      const isMaxSelected = this.selectedCoffees.size >= this.maxSelection
      const canSelect = isSelected || !isMaxSelected
      
      // Card background
      const card = pixi.createGraphics()
      if (isSelected) {
        card.lineStyle(2, 0x2196F3)
      } else if (!canSelect) {
        card.lineStyle(1, 0xDDDDDD)
      } else {
        card.lineStyle(1, 0xE0E0E0)
      }
      card.beginFill(isSelected ? 0xE3F2FD : (canSelect ? 0xFFFFFF : 0xEEEEEE))
      card.drawRect(cardX, cardY, cardWidth, cardHeight)
      card.endFill()
      contentContainer.addChild(card)
      
      // Coffee image (PNG)
      const imageSize = 32
      const imageX = cardX + (cardWidth - imageSize) / 2
      const imageY = cardY + 6
      this.drawCoffeeImage(pixi, contentContainer, coffee.id, imageX, imageY, imageSize)
      
      // Coffee name
      let name = coffee.name
      if (name.length > 6) {
        name = name.substring(0, 5) + '...'
      }
      const nameText = pixi.createText(name, {
        fontSize: 13,
        fontWeight: 'bold',
        fill: canSelect ? 0x333333 : 0x999999
      })
      nameText.anchor.set(0.5)
      nameText.x = cardX + cardWidth / 2
      nameText.y = cardY + 52
      contentContainer.addChild(nameText)
      
      // Selection indicator (checkmark for selected)
      if (isSelected) {
        const checkBg = pixi.createGraphics()
        checkBg.beginFill(0x2196F3)
        checkBg.drawCircle(cardX + cardWidth - 12, cardY + 12, 8)
        checkBg.endFill()
        contentContainer.addChild(checkBg)
        
        const checkMark = pixi.createText('✓', {
          fontSize: 10,
          fontWeight: 'bold',
          fill: 0xFFFFFF
        })
        checkMark.anchor.set(0.5)
        checkMark.x = cardX + cardWidth - 12
        checkMark.y = cardY + 12
        contentContainer.addChild(checkMark)
      }
      
      itemPositions.push({
        id: coffee.id,
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
        canSelect: canSelect
      })
    })
    
    container.addChild(contentContainer)
    
    // Draw scrollbar
    if (this.maxScrollOffset > 0) {
      const scrollbarHeight = (gridHeight / contentTotalHeight) * gridHeight
      const scrollbarY = gridY + (this.scrollOffset / this.maxScrollOffset) * (gridHeight - scrollbarHeight)
      
      const scrollbar = pixi.createGraphics()
      scrollbar.beginFill(0x000000, 0.2)
      scrollbar.drawRect(gridX + gridWidth - 6, scrollbarY, 4, scrollbarHeight)
      scrollbar.endFill()
      container.addChild(scrollbar)
    }
    
    return {
      x: gridX,
      y: gridY,
      width: gridWidth,
      height: gridHeight,
      items: itemPositions
    }
  }

  // Draw bottom buttons
  drawBottomButtons(pixi, container, modalX, modalY, modalWidth, modalHeight) {
    const btnWidth = (modalWidth - 50) / 2
    const btnHeight = 45
    const btnY = modalY + modalHeight - 60
    
    // Confirm button
    const confirmBtnX = modalX + 20
    const hasSelection = this.getSelectedCount() > 0
    
    const confirmBtn = pixi.createGraphics()
    confirmBtn.beginFill(hasSelection ? 0x4CAF50 : 0xCCCCCC)
    confirmBtn.drawRect(confirmBtnX, btnY, btnWidth, btnHeight)
    confirmBtn.endFill()
    container.addChild(confirmBtn)
    
    const confirmText = pixi.createText('开始营业', {
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0xFFFFFF
    })
    confirmText.anchor.set(0.5)
    confirmText.x = confirmBtnX + btnWidth / 2
    confirmText.y = btnY + btnHeight / 2
    container.addChild(confirmText)
    
    // Cancel button
    const cancelBtnX = modalX + 30 + btnWidth
    
    const cancelBtn = pixi.createGraphics()
    cancelBtn.beginFill(0xFF5722)
    cancelBtn.drawRect(cancelBtnX, btnY, btnWidth, btnHeight)
    cancelBtn.endFill()
    container.addChild(cancelBtn)
    
    const cancelText = pixi.createText('取消', {
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0xFFFFFF
    })
    cancelText.anchor.set(0.5)
    cancelText.x = cancelBtnX + btnWidth / 2
    cancelText.y = btnY + btnHeight / 2
    container.addChild(cancelText)
    
    return {
      confirmBtn: {
        x: confirmBtnX,
        y: btnY,
        width: btnWidth,
        height: btnHeight,
        enabled: hasSelection
      },
      cancelBtn: {
        x: cancelBtnX,
        y: btnY,
        width: btnWidth,
        height: btnHeight
      }
    }
  }

  // ========== Click Handling ==========
  handleTouch(x, y) {
    if (!this.visible || !this.uiElements) return false
    
    // Check close button
    if (this.isPointInRect(x, y, this.uiElements.closeBtn)) {
      this.hide()
      if (this.onCancel) this.onCancel()
      return true
    }
    
    // Check coffee grid
    const listArea = this.uiElements.listArea
    if (this.isPointInRect(x, y, listArea)) {
      // Check if clicked on a coffee item
      for (const item of listArea.items) {
        if (this.isPointInRect(x, y, item)) {
          if (item.canSelect) {
            this.toggleCoffee(item.id)
          } else {
            wx.showToast({ title: '已达到最大选择数量', icon: 'none' })
          }
          return true
        }
      }
      
      // Start drag scrolling
      this.isDragging = true
      this.dragStartY = y
      this.dragStartOffset = this.scrollOffset
      return true
    }
    
    // Check confirm button
    if (this.isPointInRect(x, y, this.uiElements.confirmBtn)) {
      if (this.uiElements.confirmBtn.enabled) {
        const selectedIds = this.getSelectedCoffeeIds()
        this.hide()
        if (this.onConfirm) this.onConfirm(selectedIds)
      }
      return true
    }
    
    // Check cancel button
    if (this.isPointInRect(x, y, this.uiElements.cancelBtn)) {
      this.hide()
      if (this.onCancel) this.onCancel()
      return true
    }
    
    // Clicked inside modal
    return true
  }
  
  isPointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height
  }
}

module.exports = { CoffeeSelector }
