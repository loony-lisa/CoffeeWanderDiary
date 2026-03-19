// cookbookUI.js - Cookbook Interface with PixiJS

const { pixiManager } = require('../../managers/pixiManager')

class CookbookUI {
  constructor(screenWidth, screenHeight) {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.dataManager = null
    
    // Current state
    this.visible = false
    this.currentTab = null
    
    // Interface element position cache
    this.modalInfo = null
    
    // Image cache for coffee sprites
    this.imageCache = new Map()
    this.pendingRedraw = false
    
    // Interface size configuration
    this.config = {
      get modalWidth() { return Math.floor(screenWidth * 0.9) },
      get modalHeight() { return Math.floor(screenHeight * 0.7) },
      get modalX() { return Math.floor(screenWidth * 0.05) },
      get modalY() { return Math.floor(screenHeight * 0.15) },
      tabHeight: 40,
      itemHeight: 70,
      itemPadding: 10
    }
    
    // Scroll state
    this.scrollState = {
      offset: 0,
      maxOffset: 0,
      isDragging: false,
      startY: 0,
      startOffset: 0
    }
    
    // Detail modal state
    this.detailModal = {
      visible: false,
      item: null,
      recipe: null
    }
    
    // Recipe data for detail view
    this.recipesData = null
    
    // Container for this UI
    this.container = null
    
    // Bind global touch events
    this.bindTouchEvents()
  }
  
  // ========== Global Touch Event Binding ==========
  bindTouchEvents() {
    wx.onTouchMove((e) => {
      if (!this.visible || !this.scrollState.isDragging) return
      
      const touch = e.touches[0]
      const deltaY = this.scrollState.startY - touch.clientY
      let newOffset = this.scrollState.startOffset + deltaY
      newOffset = Math.max(0, Math.min(newOffset, this.scrollState.maxOffset))
      this.scrollState.offset = newOffset
    })
    
    wx.onTouchEnd(() => {
      this.scrollState.isDragging = false
    })
  }

  // Initialize data manager
  initData(dataManager) {
    this.dataManager = dataManager
    
    // Set default Tab to first category
    const categories = this.dataManager.getCategories()
    if (categories.length > 0 && !this.currentTab) {
      this.currentTab = categories[0].id
    }
    
    // Preload coffee images
    this.preloadCoffeeImages()
    
    console.log('CookbookUI initialization completed, current Tab:', this.currentTab)
  }
  
  // Set recipes data for detail view
  setRecipesData(recipesData) {
    this.recipesData = recipesData
    console.log('CookbookUI: Recipes data set for detail view')
  }

  // ========== State Control ==========
  
  show() {
    console.log('CookbookUI.show() called')
    if (!this.dataManager) {
      console.error('Data manager not initialized')
      wx.showToast({ title: 'Data loading, please wait', icon: 'none' })
      return
    }
    
    // Reset scroll state
    this.scrollState.offset = 0
    this.scrollState.isDragging = false
    this.visible = true
    console.log('visible set to true')
  }
  
  hide() {
    console.log('CookbookUI.hide() called')
    this.visible = false
    this.modalInfo = null
    this.detailModal.visible = false
  }
  
  isVisible() {
    return this.visible
  }
  
  switchTab(tabKey) {
    const categories = this.dataManager?.getCategories() || []
    const validIds = categories.map(c => c.id)
    
    if (validIds.includes(tabKey)) {
      this.currentTab = tabKey
      this.scrollState.offset = 0
      console.log('Switched to Tab:', tabKey)
      return true
    }
    return false
  }
  
  getCurrentTab() {
    return this.currentTab
  }

  // ========== Drawing Entry ==========
  
  draw(pixi) {
    if (!this.visible) return
    if (!this.dataManager) {
      console.log('Data manager not initialized, cannot draw')
      return
    }
    
    // Get modal layer
    const layer = pixi.getLayer('modal')
    this.container = new (pixi.getPIXI().Container)()
    
    this.drawOverlay(pixi)
    this.drawModal(pixi)
    
    // Draw detail modal on top if visible
    if (this.detailModal.visible) {
      this.drawDetailModal(pixi)
    }
    
    layer.addChild(this.container)
  }

  // ========== Draw Overlay ==========
  
  drawOverlay(pixi) {
    const g = pixi.createGraphics()
      .rect(0, 0, this.screenWidth, this.screenHeight)
      .fill({ color: 0x000000, alpha: 0.6 })
    this.container.addChild(g)
  }

  // ========== Draw Modal ==========
  
  drawModal(pixi) {
    const { modalX, modalY, modalWidth, modalHeight } = this.config
    
    // White background
    const bg = pixi.createGraphics()
    bg.rect(modalX, modalY, modalWidth, modalHeight)
    bg.fill(0xFFFFFF)
    bg.stroke({ color: 0xE0E0E0, width: 1 })
    
    this.container.addChild(bg)
    
    // Title
    this.drawTitle(pixi, modalX, modalY, modalWidth)
    
    // Close button
    const closeBtnPos = this.drawCloseButton(pixi, modalX, modalY, modalWidth)
    
    // Tab bar
    const tabPos = this.drawTabs(pixi, modalX, modalY, modalWidth)
    
    // Content area
    this.drawContent(pixi, modalX, modalY, modalWidth, modalHeight)
    
    // Save position info for click detection
    this.modalInfo = {
      closeBtn: closeBtnPos,
      tabs: tabPos
    }
  }

  // Draw title
  drawTitle(pixi, modalX, modalY, modalWidth) {
    const title = pixi.createText('📚 Cookbook', {
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0x333333
    })
    title.anchor.set(0.5, 0)
    title.x = modalX + modalWidth / 2
    title.y = modalY + 15
    this.container.addChild(title)
  }

  // Draw close button
  drawCloseButton(pixi, modalX, modalY, modalWidth) {
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
    
    this.container.addChild(closeText)
    
    return { x: closeBtnX, y: closeBtnY, width: size, height: size }
  }

  // Draw Tab bar
  drawTabs(pixi, modalX, modalY, modalWidth) {
    const tabY = modalY + 55
    const tabHeight = this.config.tabHeight
    
    const categories = this.dataManager.getCategories()
    if (categories.length === 0) return []
    
    const tabWidth = modalWidth / categories.length
    const tabPositions = []
    
    categories.forEach((category, index) => {
      const tabX = modalX + tabWidth * index
      const isActive = this.currentTab === category.id
      
      // Tab background
      const tabBg = pixi.createGraphics()
      tabBg.rect(tabX, tabY, tabWidth, tabHeight)
      tabBg.fill(isActive ? 0x667eea : 0xF5F5F5)
      
      // Active state underline
      if (isActive) {
        tabBg.rect(tabX, tabY + tabHeight - 3, tabWidth, 3)
        tabBg.fill(0x764ba2)
      }
      
      // Tab text
      const tabText = pixi.createText(`${category.icon} ${category.name}`, {
        fontSize: 14,
        fontWeight: isActive ? 'bold' : 'normal',
        fill: isActive ? 0xFFFFFF : 0x666666
      })
      tabText.anchor.set(0.5)
      tabText.x = tabX + tabWidth / 2
      tabText.y = tabY + tabHeight / 2
      
      this.container.addChild(tabBg, tabText)
      
      tabPositions.push({
        key: category.id,
        x: tabX,
        y: tabY,
        width: tabWidth,
        height: tabHeight
      })
    })
    
    return tabPositions
  }

  // ========== Draw Content Area ==========
  
  drawContent(pixi, modalX, modalY, modalWidth, modalHeight) {
    const { tabHeight, itemHeight, itemPadding } = this.config
    const tabY = modalY + 55
    const contentY = tabY + tabHeight + 10
    const contentHeight = modalHeight - (contentY - modalY) - 10
    const contentWidth = modalWidth - 20
    
    // Content area background
    const contentBg = pixi.createGraphics()
      .rect(modalX + 10, contentY, contentWidth, contentHeight)
      .fill(0xFAFAFA)
    this.container.addChild(contentBg)
    
    // Draw grid items
    const items = this.dataManager.getItemsByCategory(this.currentTab)
    if (!items || items.length === 0) {
      // Show empty state
      const emptyText = pixi.createText('No data', {
        fontSize: 16,
        fill: 0x999999
      })
      emptyText.anchor.set(0.5)
      emptyText.x = modalX + 10 + contentWidth / 2
      emptyText.y = contentY + contentHeight / 2
      this.container.addChild(emptyText)
      return
    }
    
    // Grid layout configuration
    const itemsPerRow = 3
    const horizontalGap = 8
    const verticalGap = 10
    const cardWidth = (contentWidth - itemPadding * 2 - horizontalGap * (itemsPerRow - 1)) / itemsPerRow
    const cardHeight = itemHeight
    
    // Calculate total rows and total height
    const totalRows = Math.ceil(items.length / itemsPerRow)
    const contentTotalHeight = totalRows * (cardHeight + verticalGap) - verticalGap + itemPadding * 2
    this.scrollState.maxOffset = Math.max(0, contentTotalHeight - contentHeight)
    
    // Create mask for clipping
    const mask = pixi.createGraphics()
      .rect(modalX + 10, contentY, contentWidth, contentHeight)
      .fill(0xFFFFFF)
    
    const contentContainer = new (pixi.getPIXI().Container)()
    contentContainer.mask = mask
    
    // Draw grid items
    const startY = contentY + itemPadding - this.scrollState.offset
    const itemPositions = []
    
    items.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow)
      const col = index % itemsPerRow
      
      const itemX = modalX + 10 + itemPadding + col * (cardWidth + horizontalGap)
      const itemY = startY + row * (cardHeight + verticalGap)
      
      // Only draw items within visible area
      if (itemY + cardHeight < contentY || itemY > contentY + contentHeight) {
        // Still track position for click detection
        itemPositions.push({
          id: item.id,
          x: itemX,
          y: itemY,
          width: cardWidth,
          height: cardHeight
        })
        return
      }
      
      this.drawGridItemCard(pixi, contentContainer, item, itemX, itemY, cardWidth, cardHeight)
      
      itemPositions.push({
        id: item.id,
        x: itemX,
        y: itemY,
        width: cardWidth,
        height: cardHeight
      })
    })
    
    this.container.addChild(contentContainer)
    
    // Draw scrollbar
    if (this.scrollState.maxOffset > 0) {
      const scrollbarWidth = 6
      const scrollbarHeight = (contentHeight / contentTotalHeight) * contentHeight
      const scrollbarX = modalX + modalWidth - 15
      const scrollbarY = contentY + (this.scrollState.offset / this.scrollState.maxOffset) * (contentHeight - scrollbarHeight)
      
      const scrollbar = pixi.createGraphics()
        .rect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight)
        .fill({ color: 0x000000, alpha: 0.2 })
      this.container.addChild(scrollbar)
    }
    
    // Save list area info for click detection
    this.listArea = {
      x: modalX + 10,
      y: contentY,
      width: contentWidth,
      height: contentHeight,
      items: itemPositions
    }
  }

  // Draw grid card
  drawGridItemCard(pixi, container, item, x, y, width, height) {
    const isUnlocked = item.isUnlocked
    
    // Card background
    const card = pixi.createGraphics()
    card.rect(x, y, width, height)
    card.fill(isUnlocked ? 0xFFFFFF : 0xEEEEEE)
    card.stroke({ color: isUnlocked ? 0xE0E0E0 : 0xCCCCCC, width: 1 })
    
    container.addChild(card)
    
    if (isUnlocked) {
      this.drawGridUnlockedItem(pixi, container, item, x, y, width, height)
    } else {
      this.drawGridLockedItem(pixi, container, x, y, width, height)
    }
  }

  // Draw unlocked grid item
  drawGridUnlockedItem(pixi, container, item, x, y, width, height) {
    // For coffees category, try to show image
    if (this.currentTab === 'coffees') {
      this.drawCoffeeImage(pixi, container, item, x, y, width, height)
    } else {
      // Icon
      const icon = pixi.createText(item.icon || '📦', { fontSize: 28 })
      icon.anchor.set(0.5)
      icon.x = x + width / 2
      icon.y = y + 22
      container.addChild(icon)
    }
    
    // Name
    let name = item.name
    if (name.length > 6) {
      name = name.substring(0, 5) + '...'
    }
    const nameText = pixi.createText(name, {
      fontSize: 13,
      fontWeight: 'bold',
      fill: 0x333333
    })
    nameText.anchor.set(0.5)
    nameText.x = x + width / 2
    nameText.y = y + 48
    container.addChild(nameText)
  }

  // Draw locked grid item
  drawGridLockedItem(pixi, container, x, y, width, height) {
    // Semi-transparent overlay
    const overlay = pixi.createGraphics()
      .rect(x, y, width, height)
      .fill({ color: 0xC8C8C8, alpha: 0.3 })
    
    // Lock icon
    const lockIcon = pixi.createText('🔒', { fontSize: 24 })
    lockIcon.anchor.set(0.5)
    lockIcon.x = x + width / 2
    lockIcon.y = y + height / 2
    
    container.addChild(overlay, lockIcon)
  }

  // Draw coffee image
  drawCoffeeImage(pixi, container, item, x, y, width, height) {
    const imageSize = 32
    const imageX = Math.floor(x + (width - imageSize) / 2)
    const imageY = Math.floor(y + 4)
    
    // Check cache first
    const cached = this.imageCache.get(item.id)
    if (cached && cached.texture) {
      const sprite = pixi.createSprite(cached.texture)
      sprite.x = imageX
      sprite.y = imageY
      sprite.width = imageSize
      sprite.height = imageSize
      container.addChild(sprite)
      return
    }
    
    if (cached && cached.error) {
      this.drawPinkPlaceholder(pixi, container, imageX, imageY, imageSize)
      return
    }
    
    if (!cached) {
      this.loadCoffeeImage(item.id)
    }
    
    // Draw placeholder while loading
    this.drawPinkPlaceholder(pixi, container, imageX, imageY, imageSize)
  }
  
  // Load coffee image
  loadCoffeeImage(itemId) {
    const imagePath = `data/sprites/${itemId}.png`
    
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
        const texture = PIXI.Texture.from(img)
        texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
        cacheEntry.texture = texture
        cacheEntry.loaded = true
        this.pendingRedraw = true
        console.log(`Coffee image loaded: ${itemId}`)
      } catch (e) {
        cacheEntry.error = true
        console.warn(`Failed to create texture for: ${itemId}`)
      }
    }
    img.onerror = () => {
      cacheEntry.error = true
      console.log(`Failed to load coffee image: ${imagePath}`)
    }
    img.src = imagePath
  }
  
  // Preload all coffee images
  preloadCoffeeImages() {
    if (!this.dataManager) return
    
    const coffees = this.dataManager.getItemsByCategory('coffees')
    if (!coffees) return
    
    coffees.forEach(coffee => {
      if (!this.imageCache.has(coffee.id)) {
        this.loadCoffeeImage(coffee.id)
      }
    })
  }
  
  // Check if any images finished loading
  checkPendingRedraw() {
    if (this.pendingRedraw && this.visible) {
      this.pendingRedraw = false
      return true
    }
    return false
  }
  
  // Draw pink placeholder
  drawPinkPlaceholder(pixi, container, x, y, size) {
    const placeholder = pixi.createGraphics()
    placeholder.rect(x, y, size, size)
    placeholder.fill(0xFFB6C1)
    placeholder.stroke({ color: 0xFF69B4, width: 1 })
    container.addChild(placeholder)
  }

  // ========== Click Detection ==========
  
  handleTouch(x, y) {
    if (!this.visible) return false
    if (!this.modalInfo) return false
    
    // Handle detail modal clicks first
    if (this.detailModal.visible) {
      if (this.detailModal.closeBtn && pixiManager.hitTest(x, y, this.detailModal.closeBtn)) {
        this.hideDetailModal()
        return true
      }
      this.hideDetailModal()
      return true
    }
    
    // Check close button
    const closeBtn = this.modalInfo.closeBtn
    if (pixiManager.hitTest(x, y, closeBtn)) {
      this.hide()
      return true
    }
    
    // Check Tab click
    for (const tab of this.modalInfo.tabs) {
      if (pixiManager.hitTest(x, y, tab)) {
        this.switchTab(tab.key)
        return true
      }
    }
    
    // Check item clicks in list area
    if (this.listArea && pixiManager.hitTest(x, y, this.listArea)) {
      for (const itemPos of this.listArea.items) {
        if (pixiManager.hitTest(x, y, itemPos)) {
          const item = this.dataManager.getItem(itemPos.id)
          if (item && item.isUnlocked) {
            this.showDetailModal(item)
            return true
          }
        }
      }
      
      // Start drag scrolling if clicked in content area
      this.scrollState.isDragging = true
      this.scrollState.startY = y
      this.scrollState.startOffset = this.scrollState.offset
      return true
    }
    
    return true
  }
  
  // ========== Detail Modal ==========
  
  showDetailModal(item) {
    if (!item || !item.isUnlocked) return
    
    let recipe = null
    if (this.recipesData && this.recipesData.recipes) {
      recipe = this.recipesData.recipes.find(r => r.id === item.id)
    }
    
    this.detailModal = {
      visible: true,
      item: item,
      recipe: recipe
    }
    
    console.log('Showing detail modal for:', item.name)
  }
  
  hideDetailModal() {
    this.detailModal.visible = false
    this.detailModal.item = null
    this.detailModal.recipe = null
  }
  
  drawDetailModal(pixi) {
    const { modalWidth, modalHeight } = this.config
    const detailWidth = Math.floor(modalWidth * 0.85)
    const detailHeight = Math.floor(modalHeight * 0.8)
    const detailX = (this.screenWidth - detailWidth) / 2
    const detailY = (this.screenHeight - detailHeight) / 2
    
    // Darker overlay
    const overlay = pixi.createGraphics()
      .rect(0, 0, this.screenWidth, this.screenHeight)
      .fill({ color: 0x000000, alpha: 0.7 })
    this.container.addChild(overlay)
    
    // Modal background
    const bg = pixi.createGraphics()
    bg.rect(detailX, detailY, detailWidth, detailHeight)
    bg.fill(0xFFFFFF)
    bg.stroke({ color: 0x667eea, width: 2 })
    this.container.addChild(bg)
    
    // Draw close button
    const closeBtnPos = this.drawDetailCloseButton(pixi, detailX, detailY, detailWidth)
    
    // Draw content
    this.drawDetailContent(pixi, detailX, detailY, detailWidth, detailHeight)
    
    this.detailModal.closeBtn = closeBtnPos
  }
  
  drawDetailCloseButton(pixi, x, y, width) {
    const closeBtnX = x + width - 40
    const closeBtnY = y + 10
    const size = 30
    
    const circle = pixi.createGraphics()
      .circle(closeBtnX + size / 2, closeBtnY + size / 2, size / 2)
      .fill(0xFF6B6B)
    
    const closeText = pixi.createText('✕', {
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0xFFFFFF
    })
    closeText.anchor.set(0.5)
    closeText.x = closeBtnX + size / 2
    closeText.y = closeBtnY + size / 2
    
    this.container.addChild(circle, closeText)
    
    return { x: closeBtnX, y: closeBtnY, width: size, height: size }
  }
  
  drawDetailContent(pixi, x, y, width, height) {
    const item = this.detailModal.item
    const recipe = this.detailModal.recipe
    
    if (!item) return
    
    const padding = 20
    const contentX = x + padding
    const contentY = y + 60
    const contentWidth = width - padding * 2
    
    // Large image
    const imageSize = 100
    const imageX = Math.floor(x + (width - imageSize) / 2)
    const imageY = Math.floor(contentY)
    
    // Try to draw large coffee image
    const cached = this.imageCache.get(item.id)
    if (cached && cached.texture) {
      const sprite = pixi.createSprite(cached.texture)
      sprite.x = imageX
      sprite.y = imageY
      sprite.width = imageSize
      sprite.height = imageSize
      this.container.addChild(sprite)
    } else {
      // Draw placeholder
      const placeholder = pixi.createGraphics()
      placeholder.rect(imageX, imageY, imageSize, imageSize)
      placeholder.fill(0xFFB6C1)
      placeholder.stroke({ color: 0xFF69B4, width: 2 })
      
      const icon = pixi.createText(item.icon || '☕', { fontSize: 48 })
      icon.anchor.set(0.5)
      icon.x = imageX + imageSize / 2
      icon.y = imageY + imageSize / 2
      
      this.container.addChild(placeholder, icon)
    }
    
    // Name
    const nameText = pixi.createText(item.name, {
      fontSize: 22,
      fontWeight: 'bold',
      fill: 0x333333
    })
    nameText.anchor.set(0.5, 0)
    nameText.x = x + width / 2
    nameText.y = imageY + imageSize + 15
    this.container.addChild(nameText)
    
    // Recipe section
    let currentY = imageY + imageSize + 50
    
    if (recipe && recipe.ingredients) {
      const recipeTitle = pixi.createText('📋 Recipe', {
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0x667eea
      })
      recipeTitle.anchor.set(0, 0)
      recipeTitle.x = contentX
      recipeTitle.y = currentY
      this.container.addChild(recipeTitle)
      currentY += 28
      
      const ingredients = recipe.ingredients
      if (Array.isArray(ingredients)) {
        ingredients.forEach(ing => {
          const text = `• ${ing.name}${ing.amount ? ` x${ing.amount}` : ''}`
          const ingText = pixi.createText(text, {
            fontSize: 14,
            fill: 0x666666
          })
          ingText.x = contentX + 10
          ingText.y = currentY
          this.container.addChild(ingText)
          currentY += 22
        })
      } else {
        if (ingredients.base) {
          const baseText = pixi.createText(`• Base: ${ingredients.base}`, {
            fontSize: 14,
            fill: 0x666666
          })
          baseText.x = contentX + 10
          baseText.y = currentY
          this.container.addChild(baseText)
          currentY += 22
        }
        if (ingredients.flavor) {
          const flavorText = pixi.createText(`• Flavor: ${ingredients.flavor}`, {
            fontSize: 14,
            fill: 0x666666
          })
          flavorText.x = contentX + 10
          flavorText.y = currentY
          this.container.addChild(flavorText)
          currentY += 22
        }
      }
      currentY += 15
    }
    
    // Description section
    if (currentY < y + height - 60) {
      const descTitle = pixi.createText('📝 Description', {
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0x667eea
      })
      descTitle.x = contentX
      descTitle.y = currentY
      this.container.addChild(descTitle)
      currentY += 28
      
      // Description text with word wrap
      this.drawWrappedText(pixi, this.container, item.description || 'No description', 
        contentX + 10, currentY, contentWidth - 20, 20, 14, 0x555555)
    }
  }
  
  drawWrappedText(pixi, container, text, x, y, maxWidth, lineHeight, fontSize, color) {
    const chars = text.split('')
    let line = ''
    let currentY = y
    
    // Create a test text to measure width
    const testText = pixi.createText('', { fontSize, fill: color })
    
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i]
      testText.text = testLine
      
      if (testText.width > maxWidth && i > 0) {
        const lineText = pixi.createText(line, { fontSize, fill: color })
        lineText.x = x
        lineText.y = currentY
        container.addChild(lineText)
        line = chars[i]
        currentY += lineHeight
      } else {
        line = testLine
      }
    }
    
    // Draw last line
    const lastLineText = pixi.createText(line, { fontSize, fill: color })
    lastLineText.x = x
    lastLineText.y = currentY
    container.addChild(lastLineText)
  }
}

module.exports = { CookbookUI }
