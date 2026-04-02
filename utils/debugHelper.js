// utils/debugHelper.js - Debug Helper for Testing Features

/**
 * 调试助手 - 用于快速测试游戏功能
 * 
 * 使用方法:
 * 1. 在 game-main.js 中引入: const { debugHelper } = require('./utils/debugHelper')
 * 2. 在 initGame 中初始化: debugHelper.init(gameState, moneyJar)
 * 3. 在游戏中点击屏幕左上角区域 (0-50, 0-50) 触发调试菜单
 */

class DebugHelper {
  constructor() {
    this.enabled = false
    this.gameState = null
    this.moneyJar = null
    this.showMenu = false
    
    // 调试按钮配置
    this.buttons = []
    this.menuX = 10
    this.menuY = 60
    this.buttonWidth = 120
    this.buttonHeight = 35
    this.buttonGap = 5
  }
  
  init(gameState, moneyJar) {
    this.gameState = gameState
    this.moneyJar = moneyJar
    this.enabled = true
    
    // 定义调试按钮
    this.buttons = [
      { id: 'toggle', label: '关闭调试', color: 0xE74C3C, action: () => this.toggleMenu() },
      { id: 'addCoins', label: '+100金币', color: 0xF1C40F, action: () => this.addCoins(100) },
      { id: 'openShop1h', label: '营业1小时', color: 0x27AE60, action: () => this.simulateShopOpen(1) },
      { id: 'openShop7h', label: '营业7小时', color: 0xE67E22, action: () => this.simulateShopOpen(7) },
      { id: 'openShop8h', label: '营业8小时(满)', color: 0xE74C3C, action: () => this.simulateShopOpen(8) },
      { id: 'resetShop', label: '重置营业', color: 0x95A5A6, action: () => this.resetShop() },
      { id: 'printState', label: '打印状态', color: 0x3498DB, action: () => this.printState() },
    ]
    
    console.log('[调试助手] 已启用，点击左上角 (0-50, 0-50) 打开调试菜单')
  }
  
  // 切换菜单显示
  toggleMenu() {
    this.showMenu = !this.showMenu
    console.log(`[调试助手] 菜单${this.showMenu ? '打开' : '关闭'}`)
    return this.showMenu
  }
  
  // 检查是否点击了调试触发区域
  checkTrigger(x, y) {
    if (!this.enabled) return false
    
    // 左上角 50x50 区域触发调试菜单
    if (x >= 0 && x <= 50 && y >= 0 && y <= 50) {
      this.toggleMenu()
      return true
    }
    return false
  }
  
  // 检查是否点击了调试按钮
  handleClick(x, y) {
    if (!this.enabled || !this.showMenu) return false
    
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i]
      const btnX = this.menuX
      const btnY = this.menuY + i * (this.buttonHeight + this.buttonGap)
      
      if (x >= btnX && x <= btnX + this.buttonWidth &&
          y >= btnY && y <= btnY + this.buttonHeight) {
        btn.action()
        return true
      }
    }
    return false
  }
  
  // 绘制调试菜单
  draw(pixiManager) {
    if (!this.enabled || !this.showMenu) return
    
    const layer = pixiManager.getLayer('overlay')
    
    // 绘制背景
    const bg = pixiManager.createGraphics()
    bg.beginFill(0x000000, 0.8)
    bg.drawRoundedRect(this.menuX - 5, this.menuY - 5, 
                       this.buttonWidth + 10, 
                       this.buttons.length * (this.buttonHeight + this.buttonGap) + 10, 
                       5)
    bg.endFill()
    layer.addChild(bg)
    
    // 绘制按钮
    this.buttons.forEach((btn, i) => {
      const btnX = this.menuX
      const btnY = this.menuY + i * (this.buttonHeight + this.buttonGap)
      
      // 按钮背景
      const btnBg = pixiManager.createGraphics()
      btnBg.beginFill(btn.color)
      btnBg.drawRoundedRect(btnX, btnY, this.buttonWidth, this.buttonHeight, 4)
      btnBg.endFill()
      layer.addChild(btnBg)
      
      // 按钮文字
      const text = pixiManager.createText(btn.label, {
        fontSize: 12,
        fontWeight: 'bold',
        fill: 0xFFFFFF
      })
      text.anchor.set(0.5)
      text.x = btnX + this.buttonWidth / 2
      text.y = btnY + this.buttonHeight / 2
      layer.addChild(text)
    })
    
    // 绘制提示文字
    const hint = pixiManager.createText('调试模式', {
      fontSize: 10,
      fill: 0xFF0000
    })
    hint.x = 5
    hint.y = 5
    layer.addChild(hint)
  }
  
  // ========== 调试功能 ==========
  
  // 添加金币
  addCoins(amount) {
    if (!this.gameState) return
    this.gameState.addCoins(amount)
    console.log(`[调试] 添加 ${amount} 金币，当前: ${this.gameState.getCoins()}`)
    wx.showToast({ title: `+${amount} 金币`, icon: 'none' })
  }
  
  // 模拟营业指定小时数
  simulateShopOpen(hours) {
    if (!this.gameState || !this.moneyJar) return
    
    // 计算过去的时间点
    const now = new Date()
    const pastTime = new Date(now.getTime() - hours * 60 * 60 * 1000)
    const timeStr = pastTime.toISOString()
    
    // 设置营业状态
    this.gameState.openShop()
    this.gameState.setShopOpenTime(timeStr)
    this.moneyJar.setShopOpenTime(timeStr)
    
    console.log(`[调试] 模拟营业 ${hours} 小时`)
    console.log(`[调试] 营业开始时间: ${pastTime.toLocaleString()}`)
    console.log(`[调试] 当前金币: ${this.moneyJar.getPendingCoins()}`)
    
    wx.showToast({ 
      title: `模拟营业${hours}小时`, 
      icon: 'none',
      duration: 2000
    })
  }
  
  // 重置营业状态
  resetShop() {
    if (!this.gameState || !this.moneyJar) return
    
    this.gameState.closeShop()
    this.gameState.setShopOpenTime(null)
    this.moneyJar.setShopOpenTime(null)
    
    console.log('[调试] 重置营业状态')
    wx.showToast({ title: '营业已重置', icon: 'none' })
  }
  
  // 打印当前状态
  printState() {
    if (!this.gameState || !this.moneyJar) return
    
    const shopOpenTime = this.gameState.getShopOpenTime()
    const elapsedHours = this.moneyJar.getElapsedHours()
    
    console.log('========== 调试状态 ==========')
    console.log(`营业状态: ${this.gameState.getCarStatus()}`)
    console.log(`营业开始: ${shopOpenTime ? new Date(shopOpenTime).toLocaleString() : '无'}`)
    console.log(`已营业: ${elapsedHours.toFixed(2)} 小时`)
    console.log(`存钱罐金币: ${this.moneyJar.getPendingCoins()}`)
    console.log(`当前金币: ${this.gameState.getCoins()}`)
    console.log('==============================')
    
    wx.showToast({ title: '状态已打印到控制台', icon: 'none' })
  }
}

const debugHelper = new DebugHelper()

module.exports = { debugHelper }
