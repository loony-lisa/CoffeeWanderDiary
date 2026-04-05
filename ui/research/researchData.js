// researchData.js - Research System Data Layer

const { dataLoader } = require('../../managers/dataLoader')

class ResearchData {
  constructor() {
    this.baseOptions = []
    this.selectedBase = null
    this.selectedFlavors = []
    
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

  // Get selected flavors
  getSelectedFlavors() {
    return this.selectedFlavors
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
  getSelectedFlavorDetails() {
    if (!this.selectedFlavors || this.selectedFlavors.length === 0) return []
    const flavorOptions = this.getFlavorOptions()
    return this.selectedFlavors.map(id => flavorOptions.find(f => f.id === id)).filter(Boolean)
  }

  // Toggle base selection
  toggleBase(baseId) {
    this.selectedBase = this.selectedBase === baseId ? null : baseId
    return this.selectedBase
  }

  // Toggle flavor selection (multi-select)
  toggleFlavor(flavorId) {
    const index = this.selectedFlavors.indexOf(flavorId)
    if (index > -1) {
      this.selectedFlavors.splice(index, 1)
    } else {
      this.selectedFlavors.push(flavorId)
    }
    return this.selectedFlavors
  }

  // Check if research can be started
  canStartResearch() {
    return this.selectedBase !== null && this.selectedFlavors.length > 0
  }

  // Reset selection
  reset() {
    this.selectedBase = null
    this.selectedFlavors = []
  }

  // Get current selection state
  getState() {
    return {
      selectedBase: this.selectedBase,
      selectedFlavors: this.selectedFlavors,
      canStart: this.canStartResearch()
    }
  }
}

module.exports = { ResearchData }
