// recipeMatcher.js - Recipe Matching Manager

const { cookbookDataManager } = require('../ui/cookbook/cookbookDataManager')

class RecipeMatcher {
  constructor() {
    this.recipes = []
    this.unlockedRecipes = new Set()
    this.isLoaded = false
  }

  // Load recipes data (can be called multiple times to update)
  loadRecipes(recipesData) {
    if (!recipesData || !recipesData.recipes) {
      console.error('Invalid recipes data provided')
      return false
    }

    this.recipes = recipesData.recipes
    this.isLoaded = true

    // Initialize unlocked recipes
    this.recipes.forEach(recipe => {
      if (recipe.unlock && !this.unlockedRecipes.has(recipe.id)) {
        this.unlockedRecipes.add(recipe.id)
      }
    })

    console.log(`Loaded ${this.recipes.length} recipes`)
    return true
  }

  // Load from dataLoader (preferred method)
  // 从 dataLoader 获取数据，避免直接文件操作
  loadFromDataLoader(dataLoader) {
    if (dataLoader && dataLoader.hasData('recipes')) {
      const data = dataLoader.getData('recipes')
      this.loadRecipes(data)
      return true
    }
    console.warn('Recipes data not available in dataLoader, using embedded data')
    this.loadEmbeddedData()
    return false
  }

  // Load from JSON file (deprecated, kept for compatibility)
  // 微信小游戏真机环境不支持直接读取文件，请使用 loadFromDataLoader
  loadFromFile(filePath) {
    console.warn('loadFromFile is deprecated, use loadFromDataLoader instead')
    this.loadEmbeddedData()
    return true
  }

  // Use embedded default data as fallback
  loadEmbeddedData() {
    const defaultData = {
      "version": "1.0.0",
      "recipes": [
        {
          "id": "latte",
          "name": "Latte",
          "icon": "☕",
          "description": "Classic Italian latte",
          "grade": "base",
          "ingredients": { "base": "espresso", "flavor": "milk" },
          "unlock": true
        },
        {
          "id": "caramel_macchiato",
          "name": "Caramel Macchiato",
          "icon": "🍮",
          "description": "Sweet caramel macchiato",
          "grade": "select",
          "ingredients": { "base": "espresso", "flavor": "caramel" },
          "unlock": false
        },
        {
          "id": "mocha",
          "name": "Mocha",
          "icon": "🍫",
          "description": "Chocolate mocha",
          "grade": "select",
          "ingredients": { "base": "espresso", "flavor": "chocolate" },
          "unlock": false
        },
        {
          "id": "coconut_cold_brew",
          "name": "Coconut Cold Brew",
          "icon": "🥥",
          "description": "Coconut cold brew coffee",
          "grade": "premium",
          "ingredients": { "base": "cold_brew", "flavor": "coconut" },
          "unlock": false
        }
      ]
    }

    this.loadRecipes(defaultData)
    console.log('Using embedded default recipes data')
  }

  /**
   * Find matching recipe based on base and flavor
   * @param {string} baseId - Base ID
   * @param {string} flavorId - Flavor ID
   * @returns {Object|null} Matching recipe object, null if not found
   */
  findRecipe(baseId, flavorId) {
    return this.recipes.find(recipe => {
      return recipe.ingredients.base === baseId && 
             recipe.ingredients.flavor === flavorId
    }) || null
  }

  /**
   * Try to research new coffee
   * @param {string} baseId - Base ID
   * @param {string} flavorId - Flavor ID
   * @returns {Object} Research result
   */
  tryResearch(baseId, flavorId) {
    const recipe = this.findRecipe(baseId, flavorId)
    
    if (!recipe) {
      // No matching recipe found, research failed
      return {
        success: false,
        isNew: false,
        recipe: null,
        message: "This combination doesn't seem quite right..."
      }
    }
    
    // Check if already unlocked
    const isAlreadyUnlocked = this.unlockedRecipes.has(recipe.id)
    
    if (!isAlreadyUnlocked) {
      // New recipe, unlock it
      this.unlockedRecipes.add(recipe.id)
      this.saveUnlockedRecipes()
      
      // Also add to cookbook
      if (cookbookDataManager.isLoaded) {
        cookbookDataManager.addCoffeeFromRecipe(recipe)
        console.log(`Added ${recipe.name} to cookbook`)
      }
    }
    
    return {
      success: true,
      isNew: !isAlreadyUnlocked,
      recipe: recipe,
      message: isAlreadyUnlocked 
        ? `Made ${recipe.name} again!` 
        : `Congratulations! You developed a new coffee: ${recipe.name}!`
    }
  }

  /**
   * Check if recipe is unlocked
   * @param {string} recipeId 
   */
  isUnlocked(recipeId) {
    return this.unlockedRecipes.has(recipeId)
  }

  /**
   * Get all unlocked recipes
   */
  getUnlockedRecipes() {
    return this.recipes.filter(recipe => this.unlockedRecipes.has(recipe.id))
  }

  /**
   * Get all recipes (including locked ones)
   */
  getAllRecipes() {
    return this.recipes.map(recipe => ({
      ...recipe,
      isUnlocked: this.unlockedRecipes.has(recipe.id)
    }))
  }

  /**
   * Get research progress
   */
  getProgress() {
    const total = this.recipes.length
    const unlocked = this.unlockedRecipes.size
    return {
      total,
      unlocked,
      percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0
    }
  }

  /**
   * Save unlocked recipes to local storage
   */
  saveUnlockedRecipes() {
    try {
      wx.setStorageSync('unlockedRecipes', Array.from(this.unlockedRecipes))
    } catch (e) {
      console.error('Failed to save unlocked recipes:', e)
    }
  }

  /**
   * Load unlocked recipes from local storage
   */
  loadUnlockedRecipes() {
    try {
      const saved = wx.getStorageSync('unlockedRecipes')
      if (saved && Array.isArray(saved)) {
        saved.forEach(id => this.unlockedRecipes.add(id))
      }
      console.log('loadUnlockedRecipes', this.unlockedRecipes)
    } catch (e) {
      console.error('Failed to load unlocked recipes:', e)
    }
  }

  /**
   * Reset all unlock records (for debugging)
   */
  reset() {
    this.unlockedRecipes.clear()
    this.recipes.forEach(recipe => {
      if (recipe.unlock) {
        this.unlockedRecipes.add(recipe.id)
      }
    })
    this.saveUnlockedRecipes()
  }
}

// Export singleton
const recipeMatcher = new RecipeMatcher()

module.exports = { RecipeMatcher, recipeMatcher }
