// researchInput.js - Research System Input Handling Module

class ResearchInput {
  constructor(researchData, scrollState, config) {
    this.data = researchData
    this.scrollState = scrollState
    this.config = config
    this.uiElements = null
    
    // Pending selection for distinguishing click vs scroll
    this.pendingSelection = null
    
    // Threshold to distinguish click from scroll (pixels)
    this.scrollThreshold = 10
  }

  // Set UI element reference (for click detection)
  setUIElements(elements) {
    this.uiElements = elements
  }

  // Handle touch start event
  handleTouchStart(x, y) {
    if (!this.uiElements) return { handled: false }

    // Check close button
    if (this.isPointInRect(x, y, this.uiElements.closeBtn)) {
      return { handled: true, action: 'close' }
    }

    // Check coffee base area
    const baseResult = this.handleScrollAreaTouch(x, y, this.uiElements.baseArea, 'base')
    if (baseResult.handled) {
      return baseResult
    }

    // Check flavor area
    const flavorResult = this.handleScrollAreaTouch(x, y, this.uiElements.flavorArea, 'flavor')
    if (flavorResult.handled) {
      return flavorResult
    }

    // Check start research button
    if (this.isPointInRect(x, y, this.uiElements.startBtn)) {
      return { 
        handled: true, 
        action: 'startResearch',
        enabled: this.uiElements.startBtn.enabled 
      }
    }

    // Clicked inside modal but not on functional area
    return { handled: true, action: 'none' }
  }

  // Handle touch on scrollable area
  handleScrollAreaTouch(x, y, area, scrollKey) {
    // Check if inside selection area
    if (!this.isPointInRect(x, y, area)) {
      return { handled: false }
    }

    const scrollState = this.scrollState[scrollKey]

    // Check if clicked on an option
    for (const opt of area.options) {
      // Option's y coordinate already considers scroll offset, need to restore
      const actualOptY = opt.y + scrollState.offset
      if (x >= opt.x && x <= opt.x + opt.width &&
          y >= actualOptY && y <= actualOptY + opt.height) {

        // Don't select immediately, wait to see if it's a scroll
        this.pendingSelection = {
          scrollKey: scrollKey,
          id: opt.id,
          startX: x,
          startY: y
        }

        // Start drag scrolling (will be used if user moves finger)
        scrollState.isDragging = true
        scrollState.startY = y
        scrollState.startOffset = scrollState.offset

        return { handled: true, action: 'startScroll', scrollKey }
      }
    }

    // Start drag scrolling (clicked on empty area)
    scrollState.isDragging = true
    scrollState.startY = y
    scrollState.startOffset = scrollState.offset

    return { handled: true, action: 'startScroll', scrollKey }
  }

  // Handle touch move event
  handleTouchMove(x, y) {
    // Check if moved enough to cancel pending selection
    if (this.pendingSelection) {
      const deltaY = Math.abs(y - this.pendingSelection.startY)
      const deltaX = Math.abs(x - this.pendingSelection.startX)
      if (deltaY > this.scrollThreshold || deltaX > this.scrollThreshold) {
        // User is scrolling, cancel pending selection
        this.pendingSelection = null
      }
    }

    // Handle coffee base area scroll
    if (this.scrollState.base.isDragging) {
      const deltaY = this.scrollState.base.startY - y
      let newOffset = this.scrollState.base.startOffset + deltaY
      newOffset = Math.max(0, Math.min(newOffset, this.scrollState.base.maxOffset))
      this.scrollState.base.offset = newOffset
      return { handled: true, scrolled: true }
    }

    // Handle flavor area scroll
    if (this.scrollState.flavor.isDragging) {
      const deltaY = this.scrollState.flavor.startY - y
      let newOffset = this.scrollState.flavor.startOffset + deltaY
      newOffset = Math.max(0, Math.min(newOffset, this.scrollState.flavor.maxOffset))
      this.scrollState.flavor.offset = newOffset
      return { handled: true, scrolled: true }
    }

    return { handled: false }
  }

  // Handle touch end event
  handleTouchEnd() {
    const wasDragging = this.scrollState.base.isDragging || this.scrollState.flavor.isDragging
    
    // Check if there was a pending selection (click without scroll)
    if (this.pendingSelection) {
      const { scrollKey, id } = this.pendingSelection
      
      // Execute selection
      if (scrollKey === 'base') {
        this.data.toggleBase(id)
      } else {
        this.data.toggleFlavor(id)
      }
      
      this.pendingSelection = null
      
      // Stop dragging
      this.scrollState.base.isDragging = false
      this.scrollState.flavor.isDragging = false
      
      return { 
        handled: true, 
        action: 'select',
        type: scrollKey,
        id: id
      }
    }
    
    this.scrollState.base.isDragging = false
    this.scrollState.flavor.isDragging = false
    return { handled: wasDragging, action: 'endScroll' }
  }

  // Utility method: check if point is inside rectangle
  isPointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height
  }

  // Update scroll max offset
  updateScrollMaxOffset(area, scrollKey) {
    if (area && area.maxOffset !== undefined) {
      this.scrollState[scrollKey].maxOffset = area.maxOffset
    }
  }
}

module.exports = { ResearchInput }
