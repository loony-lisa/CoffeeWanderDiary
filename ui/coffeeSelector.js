// ui/coffeeSelector.js - Coffee Selector with PixiJS

const { cookbookDataManager } = require('./cookbook/cookbookDataManager')

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
      itemHeight: 60,
      itemGap: 8
    }
    
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
    return true
  }
  
  hide() {
    console.log('CoffeeSelector.hide() called')
    this.visible = false
    this.uiElements = null
    this.isDragging = false
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
        wx.showToast({ title: `Can only select up to ${this.maxSelection} coffees`, icon: 'none' })
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

  // ========== Drawing Entry ==========
  draw(pixi) {
    if (!this.visible) return
    
    const layer = pixi.getLayer('modal')
    const container = new (pixi.getPIXI().Container)()
    
    this.drawOverlay(pixi, container)
    this.uiElements = this.drawModal(pixi, container)
    
    layer.addChild(container)
  }

  // Draw overlay
  drawOverlay(pixi, container) {
    const g = pixi.createGraphics()
    g.rect(0, 0, this.screenWidth, this.screenHeight)
    g.fill({ color: 0x000000, alpha: 0.6 })
    container.addChild(g)
  }

  // Draw modal
  drawModal(pixi, container) {
    const { modalX, modalY, modalWidth, modalHeight } = this.config
    
    // White background
    const bg = pixi.createGraphics()
    bg.rect(modalX, modalY, modalWidth, modalHeight)
    bg.fill(0xFFFFFF)
    bg.stroke({ color: 0xE0E0E0, width: 1 })
    
    container.addChild(bg)
    
    // Title
    this.drawTitle(pixi, container, modalX, modalY, modalWidth)
    
    // Close button
    const closeBtn = this.drawCloseButton(pixi, container, modalX, modalY, modalWidth)
    
    // Hint text
    this.drawHint(pixi, container, modalX, modalY, modalWidth)
    
    // Coffee list
    const listArea = this.drawCoffeeList(pixi, container, modalX, modalY, modalWidth, modalHeight)
    
    // Bottom buttons
    const { confirmBtn, cancelBtn } = this.drawBottomButtons(pixi, container, modalX, modalY, modalWidth, modalHeight)
    
    return {
      closeBtn,
      listArea,
      confirmBtn,
      cancelBtn
    }
  }

  // Draw title
  drawTitle(pixi, container, modalX, modalY, modalWidth) {
    const title = pixi.createText('☕ Select Coffee to Sell Today', {
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

  // Draw hint text
  drawHint(pixi, container, modalX, modalY, modalWidth) {
    const selectedCount = this.getSelectedCount()
    const hintText = `Selected ${selectedCount}/${this.maxSelection} coffees`
    
    const hint = pixi.createText(hintText, {
      fontSize: 14,
      fill: selectedCount === this.maxSelection ? 0x4CAF50 : 0x666666
    })
    hint.anchor.set(0.5, 0)
    hint.x = modalX + modalWidth / 2
    hint.y = modalY + 45
    container.addChild(hint)
  }

  // Draw coffee list
  drawCoffeeList(pixi, container, modalX, modalY, modalWidth, modalHeight) {
    const coffees = this.getUnlockedCoffees()
    const { itemHeight, itemGap } = this.config
    
    const listX = modalX + 15
    const listY = modalY + 75
    const listWidth = modalWidth - 30
    const listHeight = modalHeight - 160
    
    // List background
    const listBg = pixi.createGraphics()
    listBg.rect(listX, listY, listWidth, listHeight)
    listBg.fill(0xF5F5F5)
    container.addChild(listBg)
    
    // Create mask for clipping
    const mask = pixi.createGraphics()
    mask.rect(listX, listY, listWidth, listHeight)
    mask.fill(0xFFFFFF)
    
    const contentContainer = new (pixi.getPIXI().Container)()
    contentContainer.mask = mask
    
    // Calculate total content height
    const contentHeight = coffees.length * (itemHeight + itemGap) - itemGap
    this.maxScrollOffset = Math.max(0, contentHeight - listHeight)
    
    // Draw coffee items
    const itemY = listY - this.scrollOffset
    const itemPositions = []
    
    coffees.forEach((coffee, index) => {
      const y = itemY + index * (itemHeight + itemGap)
      
      // Only draw visible area
      if (y + itemHeight < listY || y > listY + listHeight) {
        itemPositions.push({
          id: coffee.id,
          x: listX + 5,
          y: y,
          width: listWidth - 10,
          height: itemHeight,
          checkbox: {
            x: listX + listWidth - 40,
            y: y + 15,
            width: 30,
            height: 30
          }
        })
        return
      }
      
      const isSelected = this.selectedCoffees.has(coffee.id)
      
      // Item background
      const itemBg = pixi.createGraphics()
      itemBg.rect(listX + 5, y, listWidth - 10, itemHeight)
      itemBg.fill(isSelected ? 0xE3F2FD : 0xFFFFFF)
      
      // Selected border
      if (isSelected) {
        itemBg.stroke({ color: 0x2196F3, width: 2 })
      }
      
      contentContainer.addChild(itemBg)
      
      // Coffee icon
      const icon = pixi.createText(coffee.icon, { fontSize: 28 })
      icon.anchor.set(0.5)
      icon.x = listX + 35
      icon.y = y + itemHeight / 2
      contentContainer.addChild(icon)
      
      // Coffee name
      const nameText = pixi.createText(coffee.name, {
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0x333333
      })
      nameText.anchor.set(0, 0.5)
      nameText.x = listX + 65
      nameText.y = y + 20
      contentContainer.addChild(nameText)
      
      // Coffee description
      const descText = pixi.createText(
        coffee.description.substring(0, 20) + '...',
        { fontSize: 12, fill: 0x888888 }
      )
      descText.anchor.set(0, 0.5)
      descText.x = listX + 65
      descText.y = y + 40
      contentContainer.addChild(descText)
      
      // Checkbox
      const checkboxX = listX + listWidth - 40
      const checkboxY = y + 15
      const checkboxSize = 30
      
      // Checkbox border
      const checkbox = pixi.createGraphics()
      checkbox.rect(checkboxX, checkboxY, checkboxSize, checkboxSize)
      checkbox.fill(isSelected ? 0x2196F3 : 0xFFFFFF)
      checkbox.stroke({ color: isSelected ? 0x2196F3 : 0xCCCCCC, width: 2 })
      contentContainer.addChild(checkbox)
      
      // Check mark
      if (isSelected) {
        const checkMark = pixi.createText('✓', {
          fontSize: 20,
          fontWeight: 'bold',
          fill: 0xFFFFFF
        })
        checkMark.anchor.set(0.5)
        checkMark.x = checkboxX + checkboxSize / 2
        checkMark.y = checkboxY + checkboxSize / 2
        contentContainer.addChild(checkMark)
      }
      
      itemPositions.push({
        id: coffee.id,
        x: listX + 5,
        y: y,
        width: listWidth - 10,
        height: itemHeight,
        checkbox: {
          x: checkboxX,
          y: checkboxY,
          width: checkboxSize,
          height: checkboxSize
        }
      })
    })
    
    container.addChild(contentContainer)
    
    // Draw scrollbar
    if (this.maxScrollOffset > 0) {
      const scrollbarHeight = (listHeight / contentHeight) * listHeight
      const scrollbarY = listY + (this.scrollOffset / this.maxScrollOffset) * (listHeight - scrollbarHeight)
      
      const scrollbar = pixi.createGraphics()
      scrollbar.rect(listX + listWidth - 8, scrollbarY, 6, scrollbarHeight)
      scrollbar.fill({ color: 0x000000, alpha: 0.2 })
      container.addChild(scrollbar)
    }
    
    return {
      x: listX,
      y: listY,
      width: listWidth,
      height: listHeight,
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
    confirmBtn.rect(confirmBtnX, btnY, btnWidth, btnHeight)
    confirmBtn.fill(hasSelection ? 0x4CAF50 : 0xCCCCCC)
    container.addChild(confirmBtn)
    
    const confirmText = pixi.createText(`Confirm (${this.getSelectedCount()})`, {
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
    cancelBtn.rect(cancelBtnX, btnY, btnWidth, btnHeight)
    cancelBtn.fill(0xFF5722)
    container.addChild(cancelBtn)
    
    const cancelText = pixi.createText('Cancel', {
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
    
    // Check coffee list
    const listArea = this.uiElements.listArea
    if (this.isPointInRect(x, y, listArea)) {
      // Check if clicked on a coffee item
      for (const item of listArea.items) {
        if (this.isPointInRect(x, y, item)) {
          this.toggleCoffee(item.id)
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
        const selected = this.getSelectedCoffees()
        this.hide()
        if (this.onConfirm) this.onConfirm(selected)
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
