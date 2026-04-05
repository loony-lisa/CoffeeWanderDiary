// researchData.js - Research System Data Layer

const { dataLoader } = require('../../managers/dataLoader')

class ResearchData {
  constructor() {
    this.baseOptions = []
    this.selectedBase = null
    this.selectedFlavor = null
    
    // Load base options from base.json
    this.loadBaseOptions()
  }
  
  // Load base options from ingredients.bases (only unlocked bases)
  loadBaseOptions() {
    const ingredientsData = dataLoader.getData('ingredients')
    if (ingredientsData && ingredientsData.bases) {
      // Filter only unlocked bases
      this.baseOptions = ingredientsData.bases
        .filter(base => base.unlock === true)
        .map(base => ({
          id: base.id,
          name: base.name,
          icon: base.icon,
          desc: base.description
        }))
    } else {
      // Data not loaded yet, will retry when getBaseOptions is called
      this.baseOptions = []
    }
  }

  // Get all base options
  getBaseOptions() {
    // Reload if empty (data might have been loaded after construction)
    if (this.baseOptions.length === 0) {
      this.loadBaseOptions()
    }
    return this.baseOptions
  }

  // Get all flavor options
  getFlavorOptions() {
    const ingredientsData = dataLoader.getData('ingredients')
    if (ingredientsData && ingredientsData.flavors) {
      return ingredientsData.flavors
    }
    return []
  }

  // Get selected base
  getSelectedBase() {
    return this.selectedBase
  }

  // Get selected flavor
  getSelectedFlavor() {
    return this.selectedFlavor
  }

  // Get selected base details
  getSelectedBaseDetail() {
    if (!this.selectedBase) return null
    // Reload if empty
    if (this.baseOptions.length === 0) {
      this.loadBaseOptions()
    }
    return this.baseOptions.find(b => b.id === this.selectedBase)
  }

  // Get selected flavor details
  getSelectedFlavorDetail() {
    if (!this.selectedFlavor) return null
    const flavorOptions = this.getFlavorOptions()
    return flavorOptions.find(f => f.id === this.selectedFlavor)
  }

  // Toggle base selection
  toggleBase(baseId) {
    this.selectedBase = this.selectedBase === baseId ? null : baseId
    return this.selectedBase
  }

  // Toggle flavor selection
  toggleFlavor(flavorId) {
    this.selectedFlavor = this.selectedFlavor === flavorId ? null : flavorId
    return this.selectedFlavor
  }

  // Check if research can be started
  canStartResearch() {
    return this.selectedBase !== null && this.selectedFlavor !== null
  }

  // Reset selection
  reset() {
    this.selectedBase = null
    this.selectedFlavor = null
  }

  // Get current selection state
  getState() {
    return {
      selectedBase: this.selectedBase,
      selectedFlavor: this.selectedFlavor,
      canStart: this.canStartResearch()
    }
  }
}

module.exports = { ResearchData }
