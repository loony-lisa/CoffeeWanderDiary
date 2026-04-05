// recipeManager.js - Recipe Management Module

// Default values (will be overridden by loaded config)
const DEFAULT_SPECIAL_RECIPES = {}

class RecipeManager {
  constructor() {
    this.specialRecipes = { ...DEFAULT_SPECIAL_RECIPES }
  }

  /**
   * Load recipe configuration from JSON file
   * @param {Object} config - Recipe configuration object from game-data.json
   */
  loadConfig(config) {
    if (config.specialRecipes) {
      this.specialRecipes = { ...config.specialRecipes }
    }
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
