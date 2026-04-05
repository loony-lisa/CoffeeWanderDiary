// cookbookDataManager.js - Cookbook Data Manager

class CookbookDataManager {
  constructor() {
    this.data = null
    this.version = null
    this.isLoaded = false
    
    // Player unlock status (stored separately)
    this.unlockedItems = new Set()
    this.itemProgress = {}  // Collection progress, etc.
  }
  
  // Embedded default data (as backup)
  loadEmbeddedData() {
    const defaultData = {
      "version": "1.0.0",
      "categories": [
        { "id": "ingredients", "name": "Ingredients", "icon": "🥬", "description": "Raw materials needed for making coffee" },
        { "id": "tools", "name": "Tools", "icon": "🔧", "description": "Equipment for making and selling coffee" },
        { "id": "coffees", "name": "Coffees", "icon": "☕", "description": "Various flavored coffee drinks" }
      ],
      "items": {
        "ingredients": [
          { "id": "arabica_bean", "name": "Arabica Beans", "icon": "🫘", "description": "Arabica coffee beans, rich aroma and smooth taste", "unlock": true },
          { "id": "robusta_bean", "name": "Robusta Beans", "icon": "🫘", "description": "Robusta beans, high caffeine, strong taste", "unlock": false },
          { "id": "geisha_bean", "name": "Geisha Beans", "icon": "🌸", "description": "Precious Geisha beans, rich floral aroma, fresh taste", "unlock": false }
        ],
        "tools": [
          { "id": "grinder", "name": "Hand Grinder", "icon": "⚙️", "description": "Vintage style grinder", "unlock": true },
          { "id": "espresso_machine", "name": "Espresso Machine", "icon": "☕", "description": "Semi-automatic espresso machine", "unlock": false }
        ],
        "coffees": [
          { "id": "americano", "name": "Americano", "icon": "☕", "description": "Espresso with hot water", "unlock": true },
          { "id": "latte", "name": "Latte", "icon": "🥛", "description": "Espresso with milk", "unlock": true },
          { "id": "caramel_macchiato", "name": "Caramel Latte", "icon": "🥛", "description": "Espresso with caramel", "unlock": false }
        ]
      }
    }
    
    this.parseData(defaultData)
  }
  
  // Parse data
  parseData(data) {
    this.data = data
    this.version = data.version
    this.isLoaded = true
    
    // Initialize items object if not exists
    if (!this.data.items) {
      this.data.items = {}
    }
    
    // Auto-unlock default unlocked items
    if (data.items) {
      Object.keys(data.items).forEach(category => {
        data.items[category].forEach(item => {
          if (item.unlock && !this.unlockedItems.has(item.id)) {
            this.unlockedItems.add(item.id)
          }
        })
      })
    }
  }
  
  // Merge items from separate data files (ingredients.json, tools.json, etc.)
  mergeItemsData(categoryId, itemsData) {
    if (!this.isLoaded) {
      console.warn('Cookbook data not loaded, cannot merge items')
      return
    }
    
    // Validate data structure (ingredients uses 'beans', others use 'items')
    const itemsKey = categoryId === 'ingredients' ? 'beans' : 'items'
    if (!itemsData || !itemsData[itemsKey] || !Array.isArray(itemsData[itemsKey])) {
      console.warn(`Invalid items data for category: ${categoryId}`)
      return
    }
    
    // Initialize items object if not exists
    if (!this.data.items) {
      this.data.items = {}
    }
    
    // For ingredients category, also save flavors, bases and beans
    if (categoryId === 'ingredients') {
      this.data.ingredientsData = itemsData
    }
    
    // Merge items into the category (beans for ingredients, items for others)
    const itemsToMerge = categoryId === 'ingredients' ? itemsData.beans : itemsData.items
    this.data.items[categoryId] = itemsToMerge || []
    
    // Auto-unlock default unlocked items from merged data
    const itemsToUnlock = categoryId === 'ingredients' ? itemsData.beans : itemsData.items
    if (itemsToUnlock) {
      itemsToUnlock.forEach(item => {
        if (item.unlock && !this.unlockedItems.has(item.id)) {
          this.unlockedItems.add(item.id)
        }
      })
    }
    
    // Also auto-unlock flavors and bases for ingredients
    if (categoryId === 'ingredients') {
      if (itemsData.flavors) {
        itemsData.flavors.forEach(item => {
          if (item.unlock && !this.unlockedItems.has(item.id)) {
            this.unlockedItems.add(item.id)
          }
        })
      }
      if (itemsData.bases) {
        itemsData.bases.forEach(item => {
          if (item.unlock && !this.unlockedItems.has(item.id)) {
            this.unlockedItems.add(item.id)
          }
        })
      }
    }
    
    const mergedCount = categoryId === 'ingredients' 
      ? (itemsData.beans ? itemsData.beans.length : 0)
      : (itemsData.items ? itemsData.items.length : 0)
    console.log(`Merged ${mergedCount} items into category: ${categoryId}`)
  }
  
  // Save to local cache
  saveToLocal() {
    if (!this.data) return
    try {
      wx.setStorageSync('cookbookData', this.data)
      wx.setStorageSync('cookbookVersion', this.version)
    } catch (e) {
      console.error('Failed to save cookbook data:', e)
    }
  }

  // ========== Data Query ==========
  
  // Get all categories
  getCategories() {
    if (!this.isLoaded) return []
    return this.data.categories || []
  }
  
  // Get all items in a category
  getItemsByCategory(categoryId) {
    if (!this.isLoaded || !this.data.items) return []
    let items = this.data.items[categoryId] || []
    
    // For ingredients category, also include beans, flavors and bases
    if (categoryId === 'ingredients' && this.data.ingredientsData) {
      const beans = this.data.ingredientsData.beans || []
      const flavors = this.data.ingredientsData.flavors || []
      const bases = this.data.ingredientsData.bases || []
      items = [...beans, ...flavors, ...bases]
    }
    
    // Add unlock status
    return items.map(item => ({
      ...item,
      isUnlocked: this.unlockedItems.has(item.id),
      progress: this.itemProgress[item.id] || 0
    }))
  }
  
  // Get single item details
  getItem(itemId) {
    if (!this.isLoaded) return null
    
    for (const category of Object.keys(this.data.items)) {
      const item = this.data.items[category].find(i => i.id === itemId)
      if (item) {
        return {
          ...item,
          isUnlocked: this.unlockedItems.has(itemId),
          progress: this.itemProgress[itemId] || 0
        }
      }
    }
    
    // Also search in beans, flavors and bases
    if (this.data.ingredientsData) {
      const beans = this.data.ingredientsData.beans || []
      const flavors = this.data.ingredientsData.flavors || []
      const bases = this.data.ingredientsData.bases || []
      const item = beans.find(i => i.id === itemId) || flavors.find(i => i.id === itemId) || bases.find(i => i.id === itemId)
      if (item) {
        return {
          ...item,
          isUnlocked: this.unlockedItems.has(itemId),
          progress: this.itemProgress[itemId] || 0
        }
      }
    }
    
    return null
  }
  
  // ========== Unlock System ==========
  
  // Unlock item
  unlockItem(itemId) {
    const item = this.getItem(itemId)
    if (!item) return false
    
    if (item.isUnlocked) return true
    
    this.unlockedItems.add(itemId)
    this.saveUnlockProgress()
    return true
  }
  
  // Check if unlock conditions are met
  checkUnlockCondition(itemId, playerState) {
    const item = this.getItem(itemId)
    if (!item || !item.unlockCondition) return true
    
    const condition = item.unlockCondition
    
    if (condition.level && playerState.level < condition.level) {
      return { canUnlock: false, reason: `Requires level ${condition.level}` }
    }
    
    if (condition.coins && playerState.coins < condition.coins) {
      return { canUnlock: false, reason: `Requires ${condition.coins} coins` }
    }
    
    if (condition.rubies && playerState.rubies < condition.rubies) {
      return { canUnlock: false, reason: `Requires ${condition.rubies} rubies` }
    }
    
    return { canUnlock: true, reason: '' }
  }
  
  // Save unlock progress
  saveUnlockProgress() {
    try {
      wx.setStorageSync('cookbookUnlocked', Array.from(this.unlockedItems))
      wx.setStorageSync('cookbookProgress', this.itemProgress)
    } catch (e) {
      console.error('Failed to save unlock progress:', e)
    }
  }
  
  // Load unlock progress
  loadUnlockProgress() {
    try {
      const unlocked = wx.getStorageSync('cookbookUnlocked')
      if (unlocked && Array.isArray(unlocked)) {
        this.unlockedItems = new Set(unlocked)
      }
      
      const progress = wx.getStorageSync('cookbookProgress')
      if (progress) {
        this.itemProgress = progress
      }
    } catch (e) {
      console.error('Failed to load unlock progress:', e)
    }
  }

  // ========== Extended Features ==========
  // Get collection completion rate
  getCompletionRate() {
    if (!this.isLoaded) return { total: 0, unlocked: 0, rate: 0 }
    
    let total = 0
    Object.values(this.data.items).forEach(items => {
      total += items.length
    })
    
    const unlocked = this.unlockedItems.size
    return {
      total,
      unlocked,
      rate: total > 0 ? (unlocked / total * 100).toFixed(1) : 0
    }
  }
  
  // ========== Dynamic Coffee Addition ==========
  
  /**
   * Add new coffee to cookbook
   * @param {Object} coffeeData - Coffee data
   * @param {string} coffeeData.id - Unique identifier
   * @param {string} coffeeData.name - Name
   * @param {string} coffeeData.icon - Icon
   * @param {string} coffeeData.description - Description

   * @returns {boolean} Whether addition was successful
   */
  addCoffee(coffeeData) {
    if (!this.isLoaded || !this.data.items) {
      console.error('Cookbook data not loaded, cannot add coffee')
      return false
    }
    
    // Check required fields
    if (!coffeeData.id || !coffeeData.name) {
      console.error('Coffee data missing required fields (id, name)')
      return false
    }
    
    // Check if already exists
    const existingItem = this.getItem(coffeeData.id)
    if (existingItem) {
      // If exists but not unlocked, unlock it
      if (!existingItem.isUnlocked) {
        this.unlockItem(coffeeData.id)
      }
      return true
    }
    
    // Build complete coffee data
    const newCoffee = {
      id: coffeeData.id,
      name: coffeeData.name,
      icon: coffeeData.icon || '☕',
      description: coffeeData.description || 'A mysterious coffee',

      unlock: true  // Coffee from successful research is unlocked by default
    }
    
    // Add to coffees category
    if (!this.data.items.coffees) {
      this.data.items.coffees = []
    }
    this.data.items.coffees.push(newCoffee)
    
    // Auto-unlock
    this.unlockedItems.add(coffeeData.id)
    this.saveUnlockProgress()
    return true
  }
  
  /**
   * Add coffee to cookbook from recipe object
   * @param {Object} recipe - Recipe object
   */
  addCoffeeFromRecipe(recipe) {
    return this.addCoffee({
      id: recipe.id,
      name: recipe.name,
      icon: recipe.icon,
      description: recipe.description,

    })
  }
}

// Export singleton
const cookbookDataManager = new CookbookDataManager()

module.exports = { cookbookDataManager, CookbookDataManager }
