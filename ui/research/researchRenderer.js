// researchRenderer.js - Research System Rendering Module with PixiJS

class ResearchRenderer {
  constructor(config) {
    this.config = config
  }

  // Draw overlay
  drawOverlay(pixi, container, screenWidth, screenHeight) {
    const g = pixi.createGraphics()
    g.beginFill(0x000000, 0.6)
    g.drawRect(0, 0, screenWidth, screenHeight)
    g.endFill()
    container.addChild(g)
  }

  // Draw modal background
  drawModalBackground(pixi, container, modalX, modalY, modalWidth, modalHeight) {
    // White background with border
    const bg = pixi.createGraphics()
    bg.lineStyle(1, 0xE0E0E0)
    bg.beginFill(0xFFFFFF)
    bg.drawRect(modalX, modalY, modalWidth, modalHeight)
    bg.endFill()
    
    container.addChild(bg)
  }

  // Draw title
  drawTitle(pixi, container, modalX, modalY, modalWidth) {
    const title = pixi.createText('新品研发', {
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0x333333
    })
    title.anchor.set(0.5, 0)
    title.x = modalX + modalWidth / 2
    title.y = modalY + 12
    container.addChild(title)
  }

  // Draw close button
  drawCloseButton(pixi, container, modalX, modalY, modalWidth) {
    const closeBtnX = modalX + modalWidth - 38
    const closeBtnY = modalY + 8
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

  // Draw scrollable selection area
  drawScrollableSelectArea(pixi, container, title, options, selectedId, x, y, width, height, scrollOffset) {
    // Area title
    const titleText = pixi.createText(title, {
      fontSize: 14,
      fontWeight: 'bold',
      fill: 0x666666
    })
    titleText.anchor.set(0, 0)
    titleText.x = x + 12
    titleText.y = y + 5
    container.addChild(titleText)

    // Outer frame background
    const frame = pixi.createGraphics()
    frame.beginFill(0xF5F5F5)
    frame.drawRect(x + 10, y + 25, width - 20, height - 30)
    frame.endFill()
    container.addChild(frame)

    // Create mask for clipping
    const mask = pixi.createGraphics()
    mask.beginFill(0xFFFFFF)
    mask.drawRect(x + 10, y + 25, width - 20, height - 30)
    mask.endFill()

    const contentContainer = new (pixi.getPIXI().Container)()
    contentContainer.mask = mask

    // Grid layout configuration
    const itemsPerRow = 3
    const horizontalGap = 8
    const verticalGap = 8
    const padding = 10
    const cardWidth = (width - 20 - padding * 2 - horizontalGap * (itemsPerRow - 1)) / itemsPerRow
    const cardHeight = 70

    // Calculate total rows and total height
    const totalRows = Math.ceil(options.length / itemsPerRow)
    const contentHeight = totalRows * (cardHeight + verticalGap) - verticalGap + padding * 2
    const maxOffset = Math.max(0, contentHeight - (height - 30))

    // Draw option grid
    const startY = y + 25 + padding - scrollOffset
    const optionPositions = []

    options.forEach((option, index) => {
      const row = Math.floor(index / itemsPerRow)
      const col = index % itemsPerRow

      const optX = x + 10 + padding + col * (cardWidth + horizontalGap)
      const optY = startY + row * (cardHeight + verticalGap)

      // Only draw options within visible area
      if (optY + cardHeight < y + 25 || optY > y + height - 5) {
        optionPositions.push({
          id: option.id,
          x: optX,
          y: optY,
          width: cardWidth,
          height: cardHeight
        })
        return
      }

      const isSelected = selectedId === option.id

      // Option background with border
      const optBg = pixi.createGraphics()
      optBg.lineStyle(isSelected ? 2 : 1, isSelected ? 0x764ba2 : 0xE0E0E0)
      optBg.beginFill(isSelected ? 0x667eea : 0xFFFFFF)
      optBg.drawRect(optX, optY, cardWidth, cardHeight)
      optBg.endFill()

      contentContainer.addChild(optBg)

      // Icon
      const icon = pixi.createText(option.icon, { fontSize: 24 })
      icon.anchor.set(0.5)
      icon.x = optX + cardWidth / 2
      icon.y = optY + 22
      icon.style.fill = isSelected ? 0xFFFFFF : 0x333333
      contentContainer.addChild(icon)

      // Name
      let name = option.name
      if (name.length > 5) {
        name = name.substring(0, 4) + '...'
      }
      const nameText = pixi.createText(name, {
        fontSize: 12,
        fontWeight: 'bold',
        fill: isSelected ? 0xFFFFFF : 0x333333
      })
      nameText.anchor.set(0.5)
      nameText.x = optX + cardWidth / 2
      nameText.y = optY + 50
      contentContainer.addChild(nameText)

      optionPositions.push({
        id: option.id,
        x: optX,
        y: optY,
        width: cardWidth,
        height: cardHeight
      })
    })

    container.addChild(contentContainer)

    // Draw scrollbar
    if (maxOffset > 0) {
      const visibleHeight = height - 30
      const scrollbarHeight = (visibleHeight / contentHeight) * visibleHeight
      const scrollbarY = y + 25 + (scrollOffset / maxOffset) * (visibleHeight - scrollbarHeight)

      const scrollbar = pixi.createGraphics()
      scrollbar.beginFill(0x000000, 0.2)
      scrollbar.drawRect(x + width - 18, scrollbarY, 6, scrollbarHeight)
      scrollbar.endFill()
      container.addChild(scrollbar)
    }

    return {
      x: x + 10,
      y: y + 25,
      width: width - 20,
      height: height - 30,
      options: optionPositions,
      maxOffset
    }
  }

  // Draw start research button
  drawStartButton(pixi, container, x, y, width, canStart) {
    const btnHeight = 45
    const btnWidth = width - 40
    const btnX = x + 20
    const btnY = y

    // Button background
    const btn = pixi.createGraphics()
    btn.beginFill(canStart ? 0x4CAF50 : 0xCCCCCC)
    btn.drawRect(btnX, btnY, btnWidth, btnHeight)
    btn.endFill()
    container.addChild(btn)

    // Button text
    const btnText = pixi.createText(
      canStart ? '🔬 Start Research' : 'Please select base and flavor',
      {
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0xFFFFFF
      }
    )
    btnText.anchor.set(0.5)
    btnText.x = btnX + btnWidth / 2
    btnText.y = btnY + btnHeight / 2
    container.addChild(btnText)

    return {
      x: btnX,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      enabled: canStart
    }
  }

  // Draw complete interface
  draw(pixi, researchData, scrollState, screenWidth, screenHeight) {
    const { modalX, modalY, modalWidth, modalHeight, selectAreaHeight } = this.config
    
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

    this.drawOverlay(pixi, this.container, screenWidth, screenHeight)
    this.drawModalBackground(pixi, this.container, modalX, modalY, modalWidth, modalHeight)
    this.drawTitle(pixi, this.container, modalX, modalY, modalWidth)

    const closeBtn = this.drawCloseButton(pixi, this.container, modalX, modalY, modalWidth)

    const baseArea = this.drawScrollableSelectArea(
      pixi, this.container, '基底制作方法', researchData.getBaseOptions(), researchData.getSelectedBase(),
      modalX, modalY + 55, modalWidth, selectAreaHeight,
      scrollState.base.offset
    )

    const flavorArea = this.drawScrollableSelectArea(
      pixi, this.container, 'Flavor', researchData.getFlavorOptions(), researchData.getSelectedFlavor(),
      modalX, modalY + 55 + selectAreaHeight + 15, modalWidth, selectAreaHeight,
      scrollState.flavor.offset
    )

    const startBtn = this.drawStartButton(pixi, this.container, modalX, modalY + modalHeight - 65, modalWidth, researchData.canStartResearch())

    layer.addChild(this.container)

    return {
      closeBtn,
      baseArea: { ...baseArea, scrollKey: 'base' },
      flavorArea: { ...flavorArea, scrollKey: 'flavor' },
      startBtn
    }
  }
  
  // 清理方法，在 UI 隐藏时调用
  cleanup() {
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
}

module.exports = { ResearchRenderer }
