// ui/researchUI.js - Research System Entry Module with PixiJS
// Integrates data layer, rendering layer, input handling layer and business logic layer

const { ResearchData } = require('./research/researchData')
const { ResearchRenderer } = require('./research/researchRenderer')
const { ResearchInput } = require('./research/researchInput')
const { ResearchLogic } = require('./research/researchLogic')

class ResearchUI {
  constructor(screenWidth, screenHeight) {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight

    // Interface state
    this.visible = false

    // Size configuration
    this.config = {
      get modalWidth() { return Math.floor(screenWidth * 0.9) },
      get modalHeight() { return Math.floor(screenHeight * 0.7) },
      get modalX() { return Math.floor(screenWidth * 0.05) },
      get modalY() { return Math.floor(screenHeight * 0.15) },
      selectAreaHeight: 140,
      optionHeight: 50,
      optionGap: 8
    }

    // Initialize each layer
    this.data = new ResearchData()
    this.renderer = new ResearchRenderer(this.config)
    this.logic = new ResearchLogic(this.data)

    // Scroll state
    this.scrollState = {
      base: { offset: 0, maxOffset: 0, isDragging: false, startY: 0, startOffset: 0 },
      flavor: { offset: 0, maxOffset: 0, isDragging: false, startY: 0, startOffset: 0 }
    }

    // Input handling
    this.input = new ResearchInput(this.data, this.scrollState, this.config)

    // UI element positions (for click detection)
    this.uiElements = null

    // Redraw callback
    this.onRedraw = null

    // Bind global touch events
    this.bindTouchEvents()
  }

  // ========== Global Touch Event Binding ==========
  bindTouchEvents() {
    wx.onTouchMove((e) => {
      if (!this.visible) return
      const touch = e.touches[0]
      const result = this.input.handleTouchMove(touch.clientX, touch.clientY)
      if (result.handled && result.scrolled) {
        if (this.onRedraw) {
          this.onRedraw()
        }
      }
    })

    wx.onTouchEnd(() => {
      if (!this.visible) return
      this.input.handleTouchEnd()
    })
  }

  // ========== State Control ==========
  show() {
    console.log('ResearchUI.show() called')
    this.visible = true
    this.data.reset()
    this.scrollState.base.offset = 0
    this.scrollState.flavor.offset = 0
  }

  hide() {
    console.log('ResearchUI.hide() called')
    this.visible = false
    this.uiElements = null
    this.scrollState.base.isDragging = false
    this.scrollState.flavor.isDragging = false
    
    // 清理 renderer 中的 container
    if (this.renderer) {
      this.renderer.cleanup()
    }
  }

  isVisible() {
    return this.visible
  }

  // ========== Set Callbacks ==========
  setOnResearchComplete(callback) {
    this.logic.setOnResearchComplete(callback)
  }

  setOnRedraw(callback) {
    this.onRedraw = callback
  }

  setRecipesData(recipesData) {
    const recipeMatcherModule = require('../managers/recipeMatcher')
    const recipeMatcher = recipeMatcherModule.recipeMatcher
    if (recipesData && recipesData.recipes && recipeMatcher) {
      recipeMatcher.loadRecipes(recipesData)
      recipeMatcher.loadUnlockedRecipes()
      console.log('ResearchUI: Recipes data loaded successfully')
    }
  }

  // ========== Drawing Entry ==========
  draw(pixi) {
    if (!this.visible) return

    // Use rendering layer to draw interface
    this.uiElements = this.renderer.draw(
      pixi,
      this.data,
      this.scrollState,
      this.screenWidth,
      this.screenHeight
    )

    // Update UI element reference to input handling layer
    this.input.setUIElements(this.uiElements)

    // Update scroll max offset
    if (this.uiElements.baseArea) {
      this.scrollState.base.maxOffset = this.uiElements.baseArea.maxOffset
    }
    if (this.uiElements.flavorArea) {
      this.scrollState.flavor.maxOffset = this.uiElements.flavorArea.maxOffset
    }
  }

  // ========== Click Handling Entry ==========
  handleTouch(x, y) {
    if (!this.visible) return false

    // Ensure UI elements are set
    if (this.uiElements) {
      this.input.setUIElements(this.uiElements)
    }

    const result = this.input.handleTouchStart(x, y)

    if (!result.handled) return false

    // Handle various actions
    switch (result.action) {
      case 'close':
        this.hide()
        return true

      case 'select':
        console.log(`Selected ${result.type === 'base' ? 'base' : 'flavor'}:`, result.id)
        return true

      case 'startScroll':
        return true

      case 'startResearch':
        if (result.enabled) {
          this.logic.startResearch()
        }
        return true

      case 'none':
        return true

      default:
        return true
    }
  }
}

module.exports = { ResearchUI }
