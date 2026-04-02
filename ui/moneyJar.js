// ui/moneyJar.js - Money Jar (Coin Collection based on Shop Open Time)

const { RESOURCES } = require('../config')

class MoneyJar {
  constructor(screenWidth, screenHeight) {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    
    // Position (below shop status button)
    this.x = 15
    this.y = 125  // Below shop status button (85 + 32 + margin)
    this.width = 90
    this.height = 80
    
    // Coin accumulation
    this.coinsPerHour = 10
    this.maxHours = 8
    this.maxCoins = this.coinsPerHour * this.maxHours // 80
    
    // State
    this.shopOpenTime = null
    this.pendingCoins = 0
    this.isFull = false
    
    // Textures
    this.textureEmpty = null
    this.textureFull = null
    this.loaded = false
    
    // Animation
    this.bounceOffset = 0
    this.bounceDirection = 1
    this.lastBounceTime = 0
  }
  
  // Load textures
  async loadTextures(pixiManager) {
    try {
      const jarUrl = 'https://coffee-wander-diary-shanghai-a58yjceu96.oss-cn-shanghai.aliyuncs.com/v1.0.0/image/icon/money_jar.png'
      
      const texture = await pixiManager.loadTexture(jarUrl)
      if (!texture) {
        console.warn('Failed to load money jar texture')
        return false
      }
      
      const PIXI = pixiManager.getPIXI()
      const baseTexture = texture.baseTexture
      
      // Sprite sheet: top half = empty jar, bottom half = full jar
      // Assuming the image is vertical, split in half
      const frameWidth = baseTexture.width
      const frameHeight = baseTexture.height / 2
      
      // Empty jar (top half)
      this.textureEmpty = new PIXI.Texture(
        baseTexture,
        new PIXI.Rectangle(0, 0, frameWidth, frameHeight)
      )
      
      // Full jar (bottom half)
      this.textureFull = new PIXI.Texture(
        baseTexture,
        new PIXI.Rectangle(0, frameHeight, frameWidth, frameHeight)
      )
      
      this.loaded = true
      console.log('Money jar textures loaded')
      return true
    } catch (e) {
      console.error('Failed to load money jar textures:', e)
      return false
    }
  }
  
  // Initialize with shop open time
  init(shopOpenTime) {
    this.shopOpenTime = shopOpenTime
    this.calculatePendingCoins()
  }
  
  // Set shop open time (when shop starts)
  setShopOpenTime(timestamp) {
    this.shopOpenTime = timestamp
    this.calculatePendingCoins()
  }
  
  // Calculate pending coins based on shop open time
  calculatePendingCoins() {
    if (!this.shopOpenTime) {
      this.pendingCoins = 0
      this.isFull = false
      return 0
    }
    
    const now = new Date()
    const openTime = new Date(this.shopOpenTime)
    const elapsedMs = now - openTime
    const elapsedHours = elapsedMs / (1000 * 60 * 60)
    
    // Cap at max hours
    const effectiveHours = Math.min(elapsedHours, this.maxHours)
    this.pendingCoins = Math.floor(effectiveHours * this.coinsPerHour)
    this.isFull = elapsedHours >= this.maxHours
    
    return this.pendingCoins
  }
  
  // Calculate offline coins based on shop open time
  calculateOfflineCoins(shopOpenTime, lastExitTime) {
    if (!shopOpenTime) return 0
    
    const openTime = new Date(shopOpenTime)
    const lastExit = lastExitTime ? new Date(lastExitTime) : new Date()
    const now = new Date()
    
    // If shop was open when exited, calculate coins from open time to now
    // Otherwise no coins
    const elapsedMs = now - openTime
    const elapsedHours = elapsedMs / (1000 * 60 * 60)
    
    // Cap at max hours
    const effectiveHours = Math.min(elapsedHours, this.maxHours)
    const coins = Math.floor(effectiveHours * this.coinsPerHour)
    
    console.log(`[离线金币] 营业时长 ${elapsedHours.toFixed(2)} 小时, 获得 ${coins} 金币`)
    
    return coins
  }
  
  // Get elapsed hours since shop opened
  getElapsedHours() {
    if (!this.shopOpenTime) return 0
    const now = new Date()
    const openTime = new Date(this.shopOpenTime)
    return (now - openTime) / (1000 * 60 * 60)
  }
  
  // Check if shop has been open for max time
  isMaxTimeReached() {
    return this.getElapsedHours() >= this.maxHours
  }
  
  // Check if jar has coins to collect
  hasCoins() {
    return this.pendingCoins > 0
  }
  
  // Get pending coins
  getPendingCoins() {
    return this.pendingCoins
  }
  
  // Collect coins
  collect() {
    const coins = this.pendingCoins
    this.pendingCoins = 0
    this.isFull = false
    return coins
  }
  
  // Get shop open time
  getShopOpenTime() {
    return this.shopOpenTime
  }
  
  // Update animation
  update() {
    if (!this.hasCoins()) return
    
    const now = Date.now()
    if (now - this.lastBounceTime > 50) { // Update every 50ms
      this.bounceOffset += this.bounceDirection * 0.5
      if (Math.abs(this.bounceOffset) > 3) {
        this.bounceDirection *= -1
      }
      this.lastBounceTime = now
    }
  }
  
  // Draw the money jar
  draw(pixiManager) {
    if (!this.loaded) return
    
    const layer = pixiManager.getLayer('ui')
    const PIXI = pixiManager.getPIXI()
    
    // Create container
    const container = new PIXI.Container()
    container.x = this.x
    container.y = this.y + this.bounceOffset
    
    // Choose texture based on whether there are coins
    const texture = this.hasCoins() ? this.textureFull : this.textureEmpty
    
    if (texture) {
      const sprite = new PIXI.Sprite(texture)
      sprite.width = this.width
      sprite.height = this.height
      container.addChild(sprite)
    }
    
    // Draw coin amount if has coins
    if (this.hasCoins()) {
      // Background for text
      const bg = pixiManager.createGraphics()
      bg.beginFill(0x000000, 0.6)
      bg.drawRoundedRect(0, this.height - 20, this.width, 20, 4)
      bg.endFill()
      container.addChild(bg)
      
      // Coin amount text
      const text = pixiManager.createText(`+${this.pendingCoins}`, {
        fontSize: 14,
        fontWeight: 'bold',
        fill: 0xFFD700
      })
      text.anchor.set(0.5)
      text.x = this.width / 2
      text.y = this.height - 10
      container.addChild(text)
    }
    
    layer.addChild(container)
  }
  
  // Check if point is inside jar
  hitTest(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y + this.bounceOffset && 
           y <= this.y + this.bounceOffset + this.height
  }
}

module.exports = { MoneyJar }
