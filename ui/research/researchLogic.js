// researchLogic.js - Research System Business Logic Module

const { recipeMatcher } = require('../../managers/recipeMatcher')

class ResearchLogic {
  constructor(researchData) {
    this.data = researchData
    this.onResearchComplete = null
  }

  // Set research completion callback
  setOnResearchComplete(callback) {
    this.onResearchComplete = callback
  }

  // Execute research
  startResearch() {
    if (!this.data.canStartResearch()) {
      return null
    }

    const base = this.data.getSelectedBaseDetail()
    const flavors = this.data.getSelectedFlavorDetails()
    const flavorIds = flavors.map(f => f.id)

    // Use recipe matcher to check if it matches known recipe
    const result = recipeMatcher.tryResearch(base.id, flavorIds)

    // Show result modal
    this.showResultModal(result, base, flavors)

    return result
  }

  // Show research result modal
  showResultModal(result, base, flavor) {
    const modalWidth = 280
    const modalHeight = result.success ? 200 : 160
    const modalX = (wx.getSystemInfoSync().windowWidth - modalWidth) / 2
    const modalY = (wx.getSystemInfoSync().windowHeight - modalHeight) / 2

    // Show modal
    wx.showModal({
      title: result.success ? '🎉 Research Successful!' : '😅 Research Failed',
      content: result.success
        ? `Congratulations! You developed a new coffee: ${result.recipe.name}!\n${result.recipe.description}`
        : 'This combination doesn\'t seem quite right...\nTry other combinations!',
      showCancel: false,
      confirmText: 'Got it',
      success: () => {
        // Call completion callback
        if (this.onResearchComplete) {
          this.onResearchComplete({
            base: base,
            flavor: flavor,
            result: result.recipe ? result.recipe.name : 'Failed',
            success: result.success,
            isNew: result.isNew,
            recipe: result.recipe
          })
        }
      }
    })
  }

  // Reset selection
  reset() {
    this.data.reset()
  }
}

module.exports = { ResearchLogic }
