// dataLoader.js - Game Data Loader
// Handles async loading of JSON files with loading screen
// 数据已内嵌到 JS 中，兼容微信小游戏真机环境

// ===== 内嵌的游戏数据 =====
const embeddedData = {
  base: {
    "version": "1.0.0",
    "bases": [
      {
        "id": "espresso",
        "name": "意式浓缩",
        "icon": "☕",
        "description": "浓缩咖啡是一种通过高压热水快速萃取咖啡豆精华制成的、口感浓郁醇厚的意式咖啡基底。",
        "grade": "base",
        "tools": ["espresso_machine"],
        "unlock": true
      },
      {
        "id": "americano",
        "name": "美式咖啡",
        "icon": "🍮",
        "description": "美式咖啡是浓缩咖啡加热水稀释，口感更清淡顺滑，接近黑咖啡。",
        "grade": "select",
        "tools": ["espresso_machine"],
        "unlock": true
      },
      {
        "id": "cold_brew",
        "name": "冷萃咖啡",
        "icon": "🧊",
        "description": "用冷水长时间浸泡，口感顺滑、低酸、风味醇厚。",
        "grade": "base",
        "tools": ["cold_brew_pot"],
        "unlock": false
      },
      {
        "id": "pour_over",
        "name": "手冲咖啡",
        "icon": "☕",
        "description": "用热水缓慢萃取的黑咖啡，口感干净、风味清晰，是很多精品咖啡的基底。",
        "grade": "base",
        "tools": ["pour_over_set"],
        "unlock": false
      }
    ]
  },
  
  cookbook: {
    "version": "1.0.0",
    "categories": [
      {
        "id": "ingredients",
        "name": "食材",
        "icon": "🥬",
        "description": "制作咖啡所需的原材料"
      },
      {
        "id": "tools",
        "name": "工具",
        "icon": "🔧",
        "description": "制作和出售咖啡的器具"
      },
      {
        "id": "coffees",
        "name": "咖啡",
        "icon": "☕",
        "description": "各种风味的咖啡饮品"
      }
    ],
    "grade": {
      "base": {
        "name": "基础",
        "color": "#95A5A6",
        "probability": 0.6
      },
      "select": {
        "name": "精选",
        "color": "#3498DB",
        "probability": 0.3
      },
      "premium": {
        "name": "高级",
        "color": "#9B59B6",
        "probability": 0.09
      },
      "legendary": {
        "name": "传说",
        "color": "#F39C12",
        "probability": 0.01
      }
    }
  },
  
  ingredients: {
    "version": "1.0.0",
    "items": [
      {
        "id": "coffee_bean",
        "name": "咖啡豆",
        "icon": "🫘",
        "description": "阿拉比卡咖啡豆，香气浓郁",
        "grade": "base",
        "unlock": true,
        "properties": {
          "quality": 3,
          "price": 10
        }
      },
      {
        "id": "milk",
        "name": "鲜牛奶",
        "icon": "🥛",
        "description": "新鲜的全脂牛奶",
        "grade": "base",
        "unlock": true,
        "properties": {
          "quality": 2,
          "price": 5
        }
      },
      {
        "id": "caramel",
        "name": "焦糖酱",
        "icon": "🍯",
        "description": "手工熬制的焦糖",
        "grade": "select",
        "unlock": false,
        "unlockCondition": {
          "level": 5,
          "coins": 500
        },
        "properties": {
          "quality": 4,
          "price": 25
        }
      }
    ]
  },
  
  tools: {
    "version": "1.0.0",
    "items": [
      {
        "id": "grinder",
        "name": "手摇磨豆机",
        "icon": "⚙️",
        "description": "复古风格磨豆机",
        "grade": "base",
        "unlock": true,
        "properties": {
          "efficiency": 1
        }
      },
      {
        "id": "espresso_machine",
        "name": "意式咖啡机",
        "icon": "☕",
        "description": "半自动意式咖啡机",
        "grade": "select",
        "unlock": false,
        "unlockCondition": {
          "level": 3,
          "coins": 1000
        },
        "properties": {
          "efficiency": 3
        }
      }
    ]
  },
  
  recipes: {
    "version": "1.0.0",
    "recipes": [
      {
        "id": "americano",
        "name": "美式咖啡",
        "icon": "☕",
        "description": "浓缩咖啡加热水，口感清爽，咖啡原味突出",
        "grade": "base",
        "ingredients": {
          "base": "espresso",
          "flavor": "water"
        },
        "unlock": true
      },
      {
        "id": "latte",
        "name": "拿铁",
        "icon": "☕",
        "description": "经典意式拿铁，咖啡与牛奶的完美融合",
        "grade": "base",
        "ingredients": {
          "base": "espresso",
          "flavor": "milk"
        },
        "unlock": true
      },
      {
        "id": "caramel_macchiato",
        "name": "焦糖玛奇朵",
        "icon": "🍮",
        "description": "香甜焦糖与浓缩咖啡的绝妙搭配",
        "grade": "select",
        "ingredients": {
          "base": "espresso",
          "flavor": "caramel"
        },
        "unlock": false
      },
      {
        "id": "vanilla_latte",
        "name": "香草拿铁",
        "icon": "🌸",
        "description": "香草芬芳与咖啡香气的和谐共鸣",
        "grade": "select",
        "ingredients": {
          "base": "espresso",
          "flavor": "vanilla"
        },
        "unlock": false
      },
      {
        "id": "mocha",
        "name": "摩卡",
        "icon": "🍫",
        "description": "巧克力与咖啡的经典组合",
        "grade": "select",
        "ingredients": {
          "base": "espresso",
          "flavor": "chocolate"
        },
        "unlock": false
      },
      {
        "id": "matcha_latte",
        "name": "抹茶拿铁",
        "icon": "🍵",
        "description": "日式抹茶与咖啡的跨界融合",
        "grade": "premium",
        "ingredients": {
          "base": "espresso",
          "flavor": "matcha"
        },
        "unlock": false
      },
      {
        "id": "cinnamon_latte",
        "name": "肉桂拿铁",
        "icon": "🍂",
        "description": "温暖肉桂香，冬日必备",
        "grade": "premium",
        "ingredients": {
          "base": "espresso",
          "flavor": "cinnamon"
        },
        "unlock": false
      },
      {
        "id": "honey_americano",
        "name": "蜂蜜美式",
        "icon": "🍯",
        "description": "天然蜂蜜甜，健康之选",
        "grade": "select",
        "ingredients": {
          "base": "americano",
          "flavor": "honey"
        },
        "unlock": false
      },
      {
        "id": "coconut_cold_brew",
        "name": "生椰冷萃",
        "icon": "🥥",
        "description": "热带椰香与冷萃咖啡的清爽碰撞",
        "grade": "premium",
        "ingredients": {
          "base": "cold_brew",
          "flavor": "coconut"
        },
        "unlock": false
      },
      {
        "id": "mint_cold_brew",
        "name": "薄荷冷萃",
        "icon": "🌿",
        "description": "清凉薄荷，夏日解暑神器",
        "grade": "premium",
        "ingredients": {
          "base": "cold_brew",
          "flavor": "mint"
        },
        "unlock": false
      },
      {
        "id": "cream_mocha",
        "name": "奶油摩卡",
        "icon": "🍦",
        "description": "丝滑奶油与巧克力的双重享受",
        "grade": "legendary",
        "ingredients": {
          "base": "mocha_base",
          "flavor": "cream"
        },
        "unlock": false
      }
    ]
  }
}

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

  // Load all game data from embedded data
  async loadAllData() {
    this.isLoading = true
    this.loadingProgress = 0
    
    const filesToLoad = [
      { key: 'base', weight: 15 },
      { key: 'cookbook', weight: 15 },
      { key: 'ingredients', weight: 15 },
      { key: 'tools', weight: 15 },
      { key: 'recipes', weight: 25 }
    ]

    const totalWeight = filesToLoad.reduce((sum, f) => sum + f.weight, 0)
    let loadedWeight = 0

    try {
      for (const file of filesToLoad) {
        this.setProgress(
          Math.floor((loadedWeight / totalWeight) * 100),
          `Loading ${file.key}...`
        )

        // 从内嵌数据中加载
        if (embeddedData[file.key]) {
          this.loadedData[file.key] = embeddedData[file.key]
          console.log(`Loaded ${file.key} successfully`)
        } else {
          throw new Error(`Embedded data for ${file.key} not found`)
        }

        // 模拟异步加载，让 UI 有机会更新
        await new Promise(resolve => setTimeout(resolve, 50))

        loadedWeight += file.weight
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
