// researchData.js - Research System Data Layer

const { dataLoader } = require('../../managers/dataLoader')

// Flavor options
const FLAVOR_OPTIONS = [
  { id: 'milk', name: 'Milk', icon: '🥛', desc: 'Adds milky aroma and smoothness' },
  { id: 'caramel', name: 'Caramel', icon: '🍯', desc: 'Sweet caramel flavor' },
  { id: 'vanilla', name: 'Vanilla', icon: '🌿', desc: 'Vanilla aroma' },
  { id: 'chocolate', name: 'Chocolate', icon: '🍫', desc: 'Rich chocolate' },
  { id: 'matcha', name: 'Matcha', icon: '🍃', desc: 'Japanese matcha flavor' },
  { id: 'cinnamon', name: 'Cinnamon', icon: '🍂', desc: 'Warm cinnamon scent' },
  { id: 'honey', name: 'Honey', icon: '🐝', desc: 'Natural honey sweetness' },
  { id: 'cream', name: 'Cream', icon: '🍦', desc: 'Silky cream' },
  { id: 'coconut', name: 'Coconut', icon: '🥥', desc: 'Tropical coconut aroma' },
  { id: 'mint', name: 'Mint', icon: '🌱', desc: 'Cool mint' }
]

class ResearchData {
  constructor() {
    this.baseOptions = []
    this.flavorOptions = FLAVOR_OPTIONS
    this.selectedBase = null
    this.selectedFlavor = null
    
    // Load base options from base.json
    this.loadBaseOptions()
  }
  
  // Load base options from base.json (only unlocked bases)
  loadBaseOptions() {
    const baseData = dataLoader.getData('base')
    if (baseData && baseData.bases) {
      // Filter only unlocked bases
      this.baseOptions = baseData.bases
        .filter(base => base.unlock === true)
        .map(base => ({
          id: base.id,
          name: base.name,
          icon: base.icon,
          desc: base.description
        }))
    } else {
      console.warn('Failed to load base.json, using empty base options')
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
    return this.flavorOptions
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
    return this.flavorOptions.find(f => f.id === this.selectedFlavor)
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
