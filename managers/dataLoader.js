// dataLoader.js - Game Data Loader
// Handles async loading of JSON files with loading screen
// 数据从 OSS 拉取，兼容微信小游戏真机环境

const { OSS_BASE_URL } = require('../config')

const DATA_URL = `${OSS_BASE_URL}/data/game-data.json`

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

  // 从 OSS 拉取单文件数据
  _fetchData(url) {
    return new Promise((resolve, reject) => {
      // 微信小游戏环境
      if (typeof wx !== 'undefined' && wx.request) {
        wx.request({
          url,
          method: 'GET',
          dataType: 'json',
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(res.data)
            } else {
              reject(new Error(`HTTP ${res.statusCode}: Failed to load game data from ${url}`))
            }
          },
          fail: (err) => {
            reject(new Error(`Network error: ${err.errMsg || 'Unknown error'}`))
          }
        })
      } else {
        // 浏览器 / 开发工具 fallback
        fetch(url)
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: Failed to load game data from ${url}`)
            }
            return res.json()
          })
          .then(resolve)
          .catch(reject)
      }
    })
  }

  // Load all game data from OSS
  async loadAllData() {
    this.isLoading = true
    this.loadingProgress = 0

    // 模拟进度增长，让 UI 有机会更新
    let progressTimer = null
    const startProgressSimulation = () => {
      progressTimer = setInterval(() => {
        if (this.loadingProgress < 90) {
          this.setProgress(
            Math.min(90, this.loadingProgress + Math.floor(Math.random() * 10) + 5),
            'Loading game data...'
          )
        }
      }, 150)
    }

    const stopProgressSimulation = () => {
      if (progressTimer) {
        clearInterval(progressTimer)
        progressTimer = null
      }
    }

    try {
      this.setProgress(0, 'Connecting...')
      startProgressSimulation()

      const data = await this._fetchData(DATA_URL)

      stopProgressSimulation()

      // 验证数据结构
      const requiredKeys = ['cookbook', 'ingredients', 'tools', 'recipes', 'recipeNames']
      const missingKeys = requiredKeys.filter((key) => !data[key])

      if (missingKeys.length > 0) {
        throw new Error(`Missing data keys: ${missingKeys.join(', ')}`)
      }

      this.loadedData = data
      console.log('Loaded game data successfully from OSS')

      this.setProgress(100, 'Complete!')
      this.isLoading = false

      if (this.onCompleteCallback) {
        this.onCompleteCallback(this.loadedData)
      }

      return this.loadedData
    } catch (error) {
      stopProgressSimulation()
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
