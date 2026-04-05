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

}

// Export singleton
const recipeManager = new RecipeManager()

module.exports = { RecipeManager, recipeManager }
