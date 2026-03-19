// recipeManager.js - Recipe Management Module

// Flavor name mapping
const FLAVOR_NAMES = {
  'milk': 'Latte',
  'caramel': 'Caramel',
  'vanilla': 'Vanilla',
  'chocolate': 'Mocha',
  'matcha': 'Matcha',
  'cinnamon': 'Cinnamon',
  'honey': 'Honey',
  'cream': 'Cream',
  'coconut': 'Coconut',
  'mint': 'Mint'
}

// Base name mapping
const BASE_NAMES = {
  'espresso': 'Espresso',
  'americano': 'Americano',
  'cold_brew': 'Cold Brew',
  'latte_base': '',
  'mocha_base': 'Mocha',
  'matcha_base': 'Matcha',
  'caramel_base': 'Caramel',
  'vanilla_base': 'Vanilla'
}

// Special combination recipe table (highest priority)
const SPECIAL_RECIPES = {
  // key: "baseId_flavorId" -> value: special name
  'espresso_milk': 'Latte',
  'espresso_caramel': 'Caramel Macchiato',
  'espresso_vanilla': 'Vanilla Latte',
  'espresso_chocolate': 'Mocha',
  'espresso_matcha': 'Matcha Latte',
  'americano_milk': 'Americano Latte',
  'cold_brew_coconut': 'Coconut Cold Brew',
  'cold_brew_mint': 'Mint Cold Brew',
  'latte_base_caramel': 'Caramel Latte',
  'mocha_base_cream': 'Cream Mocha',
  'matcha_base_milk': 'Matcha Latte',
  'caramel_base_cream': 'Caramel Cream',
  'vanilla_base_honey': 'Honey Vanilla'
}

class RecipeManager {
  constructor() {
    this.flavorNames = FLAVOR_NAMES
    this.baseNames = BASE_NAMES
    this.specialRecipes = SPECIAL_RECIPES
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
   * Load recipe configuration from JSON file
   * @param {Object} config - Recipe configuration object
   */
  loadConfig(config) {
    if (config.flavorNames) {
      this.flavorNames = { ...this.flavorNames, ...config.flavorNames }
    }
    if (config.baseNames) {
      this.baseNames = { ...this.baseNames, ...config.baseNames }
    }
    if (config.specialRecipes) {
      this.specialRecipes = { ...this.specialRecipes, ...config.specialRecipes }
    }
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
