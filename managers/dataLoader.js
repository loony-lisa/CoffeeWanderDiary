// dataLoader.js - Game Data Loader
// Handles async loading of JSON files with loading screen

class DataLoader {
  constructor() {
    this.loadedData = {}
    this.isLoading = false
    this.loadingProgress = 0
    this.loadingText = 'Loading...'
    this.onProgressCallback = null
    this.onCompleteCallback = null
    this.onErrorCallback = null
  }

  // Set progress callback
  onProgress(callback) {
    this.onProgressCallback = callback
    return this
  }

  // Set complete callback
  onComplete(callback) {
    this.onCompleteCallback = callback
    return this
  }

  // Set error callback
  onError(callback) {
    this.onErrorCallback = callback
    return this
  }

  // Update progress
  setProgress(progress, text) {
    this.loadingProgress = Math.min(100, Math.max(0, progress))
    if (text) this.loadingText = text
    if (this.onProgressCallback) {
      this.onProgressCallback(this.loadingProgress, this.loadingText)
    }
  }

  // Load a single JSON file
  async loadJSON(filePath, key) {
    return new Promise((resolve, reject) => {
      const fs = wx.getFileSystemManager()
      
      try {
        // Try to read from local path
        const fullPath = `${filePath}`
        const data = fs.readFileSync(fullPath, 'utf8')
        this.loadedData[key] = JSON.parse(data)
        console.log(`Loaded ${filePath} successfully`)
        resolve(this.loadedData[key])
      } catch (e) {
        console.warn(`Failed to load ${filePath} from local, trying alternative path:`, e.message)
        
        // Try alternative path (for development environment)
        try {
          const altPath = `${wx.env.USER_DATA_PATH}/${filePath}`
          const data = fs.readFileSync(altPath, 'utf8')
          this.loadedData[key] = JSON.parse(data)
          console.log(`Loaded ${filePath} from alternative path successfully`)
          resolve(this.loadedData[key])
        } catch (e2) {
          console.error(`Failed to load ${filePath}:`, e2.message)
          reject(new Error(`Failed to load ${filePath}: ${e2.message}`))
        }
      }
    })
  }

  // Load all game data
  async loadAllData() {
    this.isLoading = true
    this.loadingProgress = 0
    
    const filesToLoad = [
      { path: 'data/base.json', key: 'base', weight: 15 },
      { path: 'data/cookbookData.json', key: 'cookbook', weight: 15 },
      { path: 'data/ingredients.json', key: 'ingredients', weight: 15 },
      { path: 'data/tools.json', key: 'tools', weight: 15 },
      { path: 'data/recipes.json', key: 'recipes', weight: 25 },
      { path: 'project.config.json', key: 'config', weight: 15 }
    ]

    let totalWeight = filesToLoad.reduce((sum, f) => sum + f.weight, 0)
    let currentWeight = 0

    try {
      for (const file of filesToLoad) {
        this.setProgress(
          (currentWeight / totalWeight) * 100,
          `Loading ${file.key}...`
        )
        
        await this.loadJSON(file.path, file.key)
        currentWeight += file.weight
      }

      this.setProgress(100, 'Complete!')
      this.isLoading = false
      
      if (this.onCompleteCallback) {
        this.onCompleteCallback(this.loadedData)
      }
      
      return this.loadedData
    } catch (error) {
      this.isLoading = false
      console.error('Data loading failed:', error)
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
      
      throw error
    }
  }

  // Get loaded data
  getData(key) {
    return this.loadedData[key] || null
  }

  // Check if data is loaded
  hasData(key) {
    return !!this.loadedData[key]
  }

  // Note: drawLoadingScreen is now handled by PixiJS in game.js
  // This method is kept for compatibility but does nothing
  drawLoadingScreen(ctx, screenWidth, screenHeight) {
    // Loading screen is now rendered by PixiJS in game.js
    // This method is deprecated and kept for backward compatibility
    console.log('drawLoadingScreen is deprecated, use PixiJS rendering instead')
  }
}

// Export singleton
const dataLoader = new DataLoader()

module.exports = { DataLoader, dataLoader }
