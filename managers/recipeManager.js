// recipeManager.js - Recipe Management Module

// Default values (will be overridden by loaded config)
const DEFAULT_FLAVOR_NAMES = {}
const DEFAULT_BASE_NAMES = {}
const DEFAULT_SPECIAL_RECIPES = {}

class RecipeManager {
  constructor() {
    this.flavorNames = { ...DEFAULT_FLAVOR_NAMES }
    this.baseNames = { ...DEFAULT_BASE_NAMES }
    this.specialRecipes = { ...DEFAULT_SPECIAL_RECIPES }
  }

  /**
   * Load recipe configuration from JSON file
   * @param {Object} config - Recipe configuration object from game-data.json
   */
  loadConfig(config) {
    if (config.flavorNames) {
      this.flavorNames = { ...config.flavorNames }
    }
    if (config.baseNames) {
      this.baseNames = { ...config.baseNames }
    }
    if (config.specialRecipes) {
      this.specialRecipes = { ...config.specialRecipes }
    }
  }

  /**
   * Generate coffee name based on base and flavor
   * @param {Object} base - Base object { id, name, icon, desc }
   * @param {Object} flavor - Flavor object { id, name, icon, desc }
   * @returns {string} Generated coffee name
   */
  generateName(base, flavor) {
    if (!base || !flavor) return 'Unknown Coffee'
    
    // 1. First check if there's a special combination recipe
    const specialKey = `${base.id}_${flavor.id}`
    if (this.specialRecipes[specialKey]) {
      return this.specialRecipes[specialKey]
    }
    
    // 2. Use default naming rules
    return this.generateDefaultName(base, flavor)
  }

  /**
   * Default naming rules
   */
  generateDefaultName(base, flavor) {
    const flavorName = this.flavorNames[flavor.id] || flavor.name
    const baseName = this.baseNames[base.id] || base.name.replace(/Base$/, '')
    
    // Rule 1: Espresso + Flavor = Flavor Latte
    if (base.id === 'espresso') {
      return `${flavorName} Latte`
    }
    
    // Rule 2: Americano + Flavor = Flavor Americano
    if (base.id === 'americano') {
      return `${flavorName} Americano`
    }
    
    // Rule 3: Cold Brew + Flavor = Flavor Cold Brew
    if (base.id === 'cold_brew') {
      return `${flavorName} Cold Brew`
    }
    
    // Rule 4: Other combinations = Flavor + Base
    const result = `${flavorName}${baseName}`
    
    // Deduplication: simplify if result contains duplicate words
    return result.replace(/Latte Latte/, 'Latte')
                 .replace(/Americano Americano/, 'Americano')
                 .replace(/Mocha Mocha/, 'Mocha')
                 .replace(/Matcha Matcha/, 'Matcha')
                 .replace(/Caramel Caramel/, 'Caramel')
                 .replace(/Vanilla Vanilla/, 'Vanilla')
  }

  /**
   * Add special recipe
   * @param {string} baseId - Base ID
   * @param {string} flavorId - Flavor ID
   * @param {string} recipeName - Recipe name
   */
  addSpecialRecipe(baseId, flavorId, recipeName) {
    const key = `${baseId}_${flavorId}`
    this.specialRecipes[key] = recipeName
  }

  /**
   * Get all special recipes
   */
  getSpecialRecipes() {
    return { ...this.specialRecipes }
  }

  /**
   * Check if there's a special recipe
   * @param {string} baseId 
   * @param {string} flavorId 
   */
  hasSpecialRecipe(baseId, flavorId) {
    const key = `${baseId}_${flavorId}`
    return !!this.specialRecipes[key]
  }
}

// Export singleton
const recipeManager = new RecipeManager()

module.exports = { RecipeManager, recipeManager }
