// game-main.js - 游戏主逻辑

const { RESOURCES } = require('./config')
const { gameState, CarStatus } = require('./managers/gameState')
const { dataLoader } = require('./managers/dataLoader')
const { recipeManager } = require('./managers/recipeManager')
const { cookbookDataManager } = require('./ui/cookbook/cookbookDataManager')
const { CookbookUI } = require('./ui/cookbook/cookbookUI')
const { ResearchUI } = require('./ui/researchUI')
const { CoffeeSelector } = require('./ui/coffeeSelector')
const { MapUI } = require('./ui/mapUI')
const { MoneyJar } = require('./ui/moneyJar')
const { pixiManager } = require('./managers/pixiManager')
const { debugHelper } = require('./utils/debugHelper')

const sysInfo = wx.getSystemInfoSync()
const screenWidth = sysInfo.windowWidth
const screenHeight = sysInfo.windowHeight

let canvas = null
let touchStartX = 0
let touchStartY = 0

const cookbookUI = new CookbookUI(screenWidth, screenHeight)
const researchUI = new ResearchUI(screenWidth, screenHeight)
const coffeeSelector = new CoffeeSelector(screenWidth, screenHeight)
const mapUI = new MapUI(screenWidth, screenHeight)
const moneyJar = new MoneyJar(screenWidth, screenHeight)

let isGameReady = false
let errorMessage = null

// 脏检查机制 - 避免每帧重复渲染
let needsRedraw = true
let frameCount = 0
const SKIP_FRAMES = 2  // 每 2 帧渲染一次 (30 FPS)，减少内存压力

const bgImages = {
  day: null,
  night: null,
  dayClose: null,
  nightClose: null
}

const statusIcons = {
  coin: null,
  ruby: null
}

// 精灵图动画
let bgNightAnimeSprite = null
let bgDayAnimeFrames = []    // 白天海滩动画帧
let bgNightAnimeFrames = []  // 夜晚海滩动画帧
let bgNightAnimeFrameIndex = 0
let bgAnimeLastFrameTime = 0
const BG_NIGHT_ANIME_FPS = 5  // 5 FPS
const BG_NIGHT_ANIME_FRAME_DURATION = 1000 / BG_NIGHT_ANIME_FPS  // 每帧持续时间(ms)

const ui = {
  buttons: [],
  topButtons: null
}

async function loadTexture(path) {
  try {
    return await pixiManager.loadTexture(path)
  } catch (e) {
    console.warn('Failed to load texture:', path, e)
    return null
  }
}

async function initGame() {
  
  if (!(await pixiManager.init())) {
    console.error('Failed to initialize PixiJS')
    errorMessage = 'Failed to initialize graphics engine'
    return
  }
  
  canvas = pixiManager.getApp().view
  
  bgImages.day = await loadTexture(RESOURCES.background('day_bg_static'))
  bgImages.night = await loadTexture(RESOURCES.background('night_bg_static'))
  bgImages.dayClose = await loadTexture(RESOURCES.background('day_bg_close'))
  bgImages.nightClose = await loadTexture(RESOURCES.background('night_bg_close'))

  statusIcons.coin = await loadTexture(RESOURCES.icon('coin'))
  statusIcons.ruby = await loadTexture(RESOURCES.icon('ruby'))
  
  // 加载存钱罐纹理
  await moneyJar.loadTextures(pixiManager)
  
  // 加载夜间背景精灵图动画
  await loadBgAnimeFrames()
  
  dataLoader.onProgress((progress, file) => {
    console.log(`Loading: ${progress}% - ${file}`)
    markDirty()  // 加载进度更新时重绘
  })
  
  dataLoader.onComplete(data => {
    console.log('Data loading complete:', Object.keys(data))
    
    if (data.cookbook) {
      cookbookDataManager.parseData(data.cookbook)
      
      // Merge items from separate data files
      if (data.ingredients) {
        cookbookDataManager.mergeItemsData('ingredients', data.ingredients)
      }
      if (data.tools) {
        cookbookDataManager.mergeItemsData('tools', data.tools)
      }
      // coffees are added dynamically through research, but we can also load from recipes
      if (data.recipes && data.recipes.recipes) {
        // Convert recipes to coffee items format
        const coffeeItems = data.recipes.recipes.map(recipe => ({
          id: recipe.id,
          name: recipe.name,
          icon: recipe.icon || '☕',
          description: recipe.description || 'A delicious coffee',
          unlock: recipe.unlock  // Coffees are unlocked through research
        }))
        cookbookDataManager.mergeItemsData('coffees', { items: coffeeItems })
      }
      
      cookbookDataManager.loadUnlockProgress()
      cookbookUI.initData(cookbookDataManager)
    }
    
    if (data.recipes) {
      researchUI.setRecipesData(data.recipes)
      cookbookUI.setRecipesData(data.recipes)
    }
    
    // Load recipe names configuration
    if (data.recipeNames) {
      recipeManager.loadConfig(data.recipeNames)
    }
    
    isGameReady = true
    
    // 初始化调试助手（开发测试用）
    debugHelper.init(gameState, moneyJar)
    
    markDirty()  // 数据加载完成后重绘
  })
  
  dataLoader.onError(err => {
    console.error('Data loading error:', err)
    errorMessage = err.message || 'Failed to load game data'
    cookbookDataManager.loadEmbeddedData()
    cookbookDataManager.loadUnlockProgress()
    cookbookUI.initData(cookbookDataManager)
    
    // Still try to load recipes for research UI even on error
    // 从 dataLoader 获取已加载的数据，避免重复加载
    const recipesData = dataLoader.getData('recipes')
    if (recipesData) {
      researchUI.setRecipesData(recipesData)
      cookbookUI.setRecipesData(recipesData)
    } else {
      console.warn('Recipes data not available in dataLoader')
    }
    
    isGameReady = true
    markDirty()  // 错误状态变化后重绘
  })
  
  dataLoader.loadAllData()
  
  researchUI.setOnResearchComplete(result => {
    if (result.success && result.recipe) {
      cookbookDataManager.addCoffeeFromRecipe(result.recipe)
      wx.showToast({
        title: `Unlocked: ${result.recipe.name}`,
        icon: 'success'
      })
    }
  })
  
  coffeeSelector.setOnConfirm(coffees => {
    // 确认后开始营业
    const now = new Date().toISOString()
    gameState.openShop()
    gameState.setShopOpenTime(now)
    moneyJar.setShopOpenTime(now)
    wx.showToast({
      title: `开始营业，售卖 ${coffees.length} 种咖啡`,
      icon: 'none'
    })
  })
  
  coffeeSelector.setOnCancel(() => {
    // Selection cancelled
  })
  
  // Set up map UI callbacks
  mapUI.setOnDirectionClick((direction, viewportX, viewportY) => {
    // Handle direction click - could update target city based on position
    console.log(`Map moved ${direction} to (${viewportX}, ${viewportY})`)
  })
  
  mapUI.setOnClose(() => {
    // Map closed without traveling
  })
  
  mapUI.setOnConfirmTravel((city, cost, time) => {
    // Handle travel confirmation
    console.log(`Traveling to ${city}, cost: ${cost}, time: ${time}`)
    
    // Check if player has enough money
    if (gameState.getCoins() >= cost) {
      gameState.spendCoins(cost)
      const targetCity = gameState.travelToNext()
      wx.showToast({
        title: `已到达${targetCity}`,
        icon: 'success'
      })
    } else {
      wx.showToast({
        title: '金币不足，无法前往',
        icon: 'none'
      })
    }
  })
  
  startGameLoop()
}

async function loadBgAnimeFrames() {
  try {
    // 加载白天海滩动画
    await loadBgAnimeFramesForType('beach_day', 'day')
    // 加载夜晚海滩动画
    await loadBgAnimeFramesForType('beach_night', 'night')
  } catch (e) {
    console.warn('Failed to load bg_anime frames:', e)
  }
}

async function loadBgAnimeFramesForType(animeName, type) {
  try {
    // 从 OSS 加载 JSON 配置文件
    const jsonUrl = RESOURCES.animeJson(animeName)
    console.log(`[Debug] JSON URL (${type}):`, jsonUrl)
    
    const jsonData = await new Promise((resolve, reject) => {
      wx.request({
        url: jsonUrl,
        method: 'GET',
        header: {
          'Content-Type': 'application/json'
        },
        success: (res) => {
          console.log(`[Debug] wx.request success (${type}):`, res.statusCode, res.header)
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            console.error(`[Debug] Response data (${type}):`, res.data)
            reject(new Error(`Failed to load JSON: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          console.error(`[Debug] wx.request fail (${type}):`, err)
          reject(err)
        }
      })
    })
    
    // 从 OSS 加载精灵图
    const spriteSheetUrl = RESOURCES.anime(animeName)
    const spriteSheetTexture = await loadTexture(spriteSheetUrl)
    
    if (!spriteSheetTexture) {
      console.warn(`Sprite sheet texture is null (${type}), skipping animation load`)
      return
    }
    
    const PIXI = pixiManager.getPIXI()
    const frames = []
    
    // 从 JSON 中按顺序提取帧数据（frame_0001 0.png 到 frame_0001 19.png）
    for (let i = 0; i < 20; i++) {
      const frameKey = `frame_0001 ${i}.png`
      const frameData = jsonData.frames[frameKey]
      
      if (!frameData) {
        console.warn(`Frame ${i} not found in JSON (${type})`)
        continue
      }
      
      const { x, y, w, h } = frameData.frame
      
      // 从雪碧图创建子纹理
      const frameTexture = new PIXI.Texture(
        spriteSheetTexture.baseTexture,
        new PIXI.Rectangle(x, y, w, h)
      )
      frames.push(frameTexture)
    }
    
    if (type === 'day') {
      bgDayAnimeFrames = frames
    } else {
      bgNightAnimeFrames = frames
    }
    console.log(`Loaded ${frames.length} frames for bg_${type}_anime`)
  } catch (e) {
    console.warn(`Failed to load bg_${type}_anime frames:`, e)
    if (type === 'day') {
      bgDayAnimeFrames = []
    } else {
      bgNightAnimeFrames = []
    }
  }
}

function updateBgAnime() {
  const dateTime = gameState.getDateTime()
  const currentFrames = dateTime.isDaytime ? bgDayAnimeFrames : bgNightAnimeFrames
  
  if (currentFrames.length === 0) return
  
  const now = Date.now()
  if (now - bgAnimeLastFrameTime >= BG_NIGHT_ANIME_FRAME_DURATION) {
    bgNightAnimeFrameIndex = (bgNightAnimeFrameIndex + 1) % currentFrames.length
    bgAnimeLastFrameTime = now
    
    // 更新精灵纹理
    if (bgNightAnimeSprite) {
      bgNightAnimeSprite.texture = currentFrames[bgNightAnimeFrameIndex]
    }
  }
}

function startGameLoop() {
  const app = pixiManager.getApp()
  
  app.ticker.add(() => {
    frameCount++
    
    // 更新精灵图动画（每帧都更新，不跳过）
    updateBgAnime()
    
    // 检查是否需要自动停止营业
    if (isGameReady) {
      checkAutoCloseShop()
    }
    
    // 检查UI是否需要重绘（异步图片加载完成）
    if (checkUIRedraw()) {
      markDirty()
    }
    
    // 跳过部分帧，降低渲染频率
    if (frameCount % (SKIP_FRAMES + 1) !== 0) return
    
    // 只有在需要重绘时才渲染
    if (needsRedraw || !isGameReady || errorMessage) {
      render()
      if (isGameReady && !errorMessage) {
        needsRedraw = false
      }
    }
    
    // 关键修复：确保 WebGL 渲染器正确刷新
    // 微信小游戏需要显式调用 render 来提交帧
    if (app.renderer && app.renderer.type === 1) {  // 1 = WebGL
      app.renderer.render(app.stage)
    }
  })
}

// 标记需要重绘
function markDirty() {
  needsRedraw = true
}

function render() {
  pixiManager.clearAllLayers()
  
  if (!isGameReady) {
    drawLoadingScreen()
    return
  }
  
  if (errorMessage) {
    drawErrorScreen()
    return
  }
  
  drawBackground()
  drawStatusBar()
  drawTopButtons()
  drawMainButtons()
  drawMoneyJar()
  
  if (cookbookUI.isVisible()) {
    cookbookUI.draw(pixiManager)
  }
  
  if (researchUI.isVisible()) {
    researchUI.draw(pixiManager)
  }
  
  if (coffeeSelector.isVisible()) {
    coffeeSelector.draw(pixiManager)
  }
  
  if (mapUI.isVisible()) {
    mapUI.draw(pixiManager)
  }
  
  // 绘制调试菜单
  debugHelper.draw(pixiManager)
}

// Check if any UI needs redraw due to async image loading
function checkUIRedraw() {
  if (cookbookUI.checkPendingRedraw && cookbookUI.checkPendingRedraw()) {
    return true
  }
  if (coffeeSelector.checkPendingRedraw && coffeeSelector.checkPendingRedraw()) {
    return true
  }
  if (mapUI.checkPendingRedraw && mapUI.checkPendingRedraw()) {
    return true
  }
  return false
}

function drawLoadingScreen() {
  const layer = pixiManager.getLayer('overlay')
  const PIXI = pixiManager.getPIXI()
  
  const bg = pixiManager.createGraphics()
  bg.beginFill(0x2C3E50)
  bg.drawRect(0, 0, screenWidth, screenHeight)
  bg.endFill()
  layer.addChild(bg)
  
  const text = pixiManager.createText('Loading...', {
    fontSize: 24,
    fontWeight: 'bold',
    fill: 0xFFFFFF
  })
  text.anchor.set(0.5)
  text.x = screenWidth / 2
  text.y = screenHeight / 2 - 30
  layer.addChild(text)
  
  const progress = dataLoader.loadingProgress || 0
  const progressText = pixiManager.createText(`${Math.floor(progress)}%`, {
    fontSize: 18,
    fill: 0xCCCCCC
  })
  progressText.anchor.set(0.5)
  progressText.x = screenWidth / 2
  progressText.y = screenHeight / 2 + 20
  layer.addChild(progressText)
  
  const barWidth = 200
  const barHeight = 10
  const barX = (screenWidth - barWidth) / 2
  const barY = screenHeight / 2 + 50
  
  const barBg = pixiManager.createGraphics()
  barBg.beginFill(0x34495E)
  barBg.drawRoundedRect(barX, barY, barWidth, barHeight, 5)
  barBg.endFill()
  layer.addChild(barBg)
  
  const fillWidth = progress / 100 * barWidth
  const barFill = pixiManager.createGraphics()
  barFill.beginFill(0x3498DB)
  barFill.drawRoundedRect(barX, barY, fillWidth, barHeight, 5)
  barFill.endFill()
  layer.addChild(barFill)
}

function drawErrorScreen() {
  const layer = pixiManager.getLayer('overlay')
  const bg = pixiManager.createGraphics()
  bg.beginFill(0x2C3E50)
  bg.drawRect(0, 0, screenWidth, screenHeight)
  bg.endFill()
  layer.addChild(bg)
  
  const icon = pixiManager.createText('⚠️', { fontSize: 48 })
  icon.anchor.set(0.5)
  icon.x = screenWidth / 2
  icon.y = screenHeight / 2 - 50
  layer.addChild(icon)
  
  const title = pixiManager.createText('Loading Failed', {
    fontSize: 20,
    fontWeight: 'bold',
    fill: 0xE74C3C
  })
  title.anchor.set(0.5)
  title.x = screenWidth / 2
  title.y = screenHeight / 2 + 10
  layer.addChild(title)
  
  const msg = pixiManager.createText(errorMessage || 'Unknown error', {
    fontSize: 14,
    fill: 0xCCCCCC
  })
  msg.anchor.set(0.5)
  msg.x = screenWidth / 2
  msg.y = screenHeight / 2 + 40
  layer.addChild(msg)
}

function drawBackground() {
  const layer = pixiManager.getLayer('background')
  const dateTime = gameState.getDateTime()
  const carStatus = gameState.getCarStatus()
  
  // 根据店铺状态和时间段选择背景图
  let bgImage = null
  if (carStatus === 'Open') {
    bgImage = dateTime.isDaytime ? bgImages.day : bgImages.night
  } else {
    bgImage = dateTime.isDaytime ? bgImages.dayClose : bgImages.nightClose
  }
  
  if (bgImage) {
    const sprite = pixiManager.createSprite(bgImage)
    sprite.width = screenWidth
    sprite.height = screenHeight
    layer.addChild(sprite)
  } else {
    const color = dateTime.isDaytime ? 0x87CEEB : 0x2C3E50
    const bg = pixiManager.createGraphics()
    bg.beginFill(color)
    bg.drawRect(0, 0, screenWidth, screenHeight)
    bg.endFill()
    layer.addChild(bg)
  }
  
  // 绘制精灵图动画在页面正当中
  drawBgNightAnime()
}

function drawBgNightAnime() {
  const dateTime = gameState.getDateTime()
  const currentFrames = dateTime.isDaytime ? bgDayAnimeFrames : bgNightAnimeFrames
  
  if (currentFrames.length === 0) return
  
  // 只有在营业中时才显示背景动画
  if (gameState.getCarStatus() !== 'Open') return
  
  const layer = pixiManager.getLayer('backgroundAnime')
  
  // 如果精灵不存在或已被销毁（被 clearAllLayers 销毁），重新创建
  if (!bgNightAnimeSprite || bgNightAnimeSprite._destroyed) {
    bgNightAnimeSprite = pixiManager.createSprite(currentFrames[0])
    bgNightAnimeSprite.anchor.set(0.5)  // 设置锚点为中心
  }
  
  // 更新当前帧
  bgNightAnimeSprite.texture = currentFrames[bgNightAnimeFrameIndex]
  
  // 获取原图尺寸
  const texture = currentFrames[bgNightAnimeFrameIndex]
  const originalWidth = texture.orig ? texture.orig.width : texture.width
  const originalHeight = texture.orig ? texture.orig.height : texture.height
  
  // 计算缩放比例：宽度与屏幕宽度一致，保持宽高比
  const scale = screenWidth / originalWidth
  
  // 计算位置：居中显示
  bgNightAnimeSprite.x = screenWidth / 2
  bgNightAnimeSprite.y = screenHeight / 2
  
  // 应用缩放
  bgNightAnimeSprite.scale.set(scale)
  
  layer.addChild(bgNightAnimeSprite)
}

function drawTopButtons() {
  const layer = pixiManager.getLayer('ui')
  const btnSize = 44
  const btnGap = 10
  const startX = screenWidth - btnSize - 15
  const startY = 15
  
  const buttons = [
    { id: 'settings', icon: '⚙️', x: startX, y: startY },
    { id: 'shop', icon: '🏪', x: startX, y: startY + btnSize + btnGap }
  ]
  
  ui.topButtons = []
  
  buttons.forEach(btn => {
    const bg = pixiManager.createGraphics()
    bg.beginFill(0xFFFFFF, 0.9)
    bg.drawRoundedRect(btn.x, btn.y, btnSize, btnSize, 8)
    bg.endFill()
    bg.lineStyle(1, 0x000000, 0.1)
    bg.drawRoundedRect(btn.x, btn.y, btnSize, btnSize, 8)
    layer.addChild(bg)
    
    const icon = pixiManager.createText(btn.icon, { fontSize: 24 })
    icon.anchor.set(0.5)
    icon.x = btn.x + btnSize / 2
    icon.y = btn.y + btnSize / 2
    layer.addChild(icon)
    
    ui.topButtons.push({
      id: btn.id,
      x: btn.x,
      y: btn.y,
      width: btnSize,
      height: btnSize
    })
  })
}

function drawStatusBar() {
  const layer = pixiManager.getLayer('ui')
  const barWidth = screenWidth * 0.6
  const barHeight = 50
  const x = 15
  const y = 15
  
  const bg = pixiManager.createGraphics()
  bg.beginFill(0xFFFFFF, 0.9)
  bg.drawRoundedRect(x, y, barWidth, barHeight, 10)
  bg.endFill()
  bg.lineStyle(1, 0x000000, 0.1)
  bg.drawRoundedRect(x, y, barWidth, barHeight, 10)
  layer.addChild(bg)
  
  const items = [
    { icon: statusIcons.coin, value: gameState.getCoins(), x: x + 15 },
    { icon: statusIcons.ruby, value: gameState.getRubies(), x: x + barWidth * 0.4 }
  ]
  
  items.forEach(item => {
    if (item.icon) {
      // 使用图片精灵
      const iconSprite = pixiManager.createSprite(item.icon)
      iconSprite.anchor.set(0, 0.5)
      iconSprite.x = item.x
      iconSprite.y = y + barHeight / 2
      iconSprite.width = 20
      iconSprite.height = 20
      layer.addChild(iconSprite)
    } else {
      // 降级到 emoji
      const iconText = pixiManager.createText(item === items[0] ? '💰' : '💎', { fontSize: 20 })
      iconText.anchor.set(0, 0.5)
      iconText.x = item.x
      iconText.y = y + barHeight / 2
      layer.addChild(iconText)
    }
    
    const text = pixiManager.createText(String(item.value), {
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0x333333
    })
    text.anchor.set(0, 0.5)
    text.x = item.x + 28
    text.y = y + barHeight / 2
    layer.addChild(text)
  })
  
  const dateTime = gameState.getDateTime()
  
  const location = pixiManager.createText(`📍 ${gameState.getCurrentCity()}`, {
    fontSize: 12,
    fill: 0x666666
  })
  location.anchor.set(0, 0.5)
  location.x = x + 15
  location.y = y + barHeight + 15
  layer.addChild(location)
  
  const time = pixiManager.createText(`🕐 ${dateTime.time}`, {
    fontSize: 12,
    fill: 0x666666
  })
  time.anchor.set(0, 0.5)
  time.x = x + barWidth * 0.5
  time.y = y + barHeight + 15
  layer.addChild(time)
  
  // 店铺状态显示
  const carStatus = gameState.getCarStatus()
  const statusText = carStatus === 'Open' ? '营业中' : '休息中'
  const statusColor = carStatus === 'Open' ? 0x27AE60 : 0xE74C3C
  
  const status = pixiManager.createText(`● ${statusText}`, {
    fontSize: 12,
    fontWeight: 'bold',
    fill: statusColor
  })
  status.anchor.set(0, 0.5)
  status.x = x + barWidth * 0.85
  status.y = y + barHeight + 15
  layer.addChild(status)
}

function drawMainButtons() {
  const layer = pixiManager.getLayer('ui')
  const btnCount = 5
  const btnGap = 12
  const btnSize = 48  // 小方框按钮尺寸（稍微缩小以适应5个按钮）
  const labelHeight = 20  // 文字标签高度
  const totalWidth = btnCount * btnSize + (btnCount - 1) * btnGap
  const startX = (screenWidth - totalWidth) / 2
  const btnY = screenHeight - btnSize - labelHeight - 30
  
  const buttons = [
    { id: 'travel', icon: '🚗', label: '地图', color: 0x3498DB },
    { id: 'sell', icon: '☕', label: '菜单', color: 0xE67E22 },
    { id: 'research', icon: '🔬', label: '研发', color: 0x9B59B6 },
    { id: 'cookbook', icon: '📖', label: '图鉴', color: 0x27AE60 },
    { id: 'message', icon: '💬', label: '留言板', color: 0xF39C12 }
  ]
  
  ui.buttons = []
  
  buttons.forEach((btn, index) => {
    const x = startX + index * (btnSize + btnGap)
    const container = createIconButton(x, btnY, btnSize, btn.icon, btn.label, btn.color)
    layer.addChild(container)
    ui.buttons.push({
      id: btn.id,
      x: x,
      y: btnY,
      width: btnSize,
      height: btnSize + labelHeight
    })
  })
  
  // 绘制营业/停止营业按钮
  drawShopStatusButton()
}

function drawMoneyJar() {
  // 更新存钱罐动画
  moneyJar.update()
  // 绘制存钱罐
  moneyJar.draw(pixiManager)
}

function drawShopStatusButton() {
  const layer = pixiManager.getLayer('ui')
  const carStatus = gameState.getCarStatus()
  
  // 按钮位置和尺寸
  const btnWidth = 90
  const btnHeight = 32
  const btnX = 15  // 与城市名左对齐
  const btnY = 85  // 在城市名下方
  
  const isOpen = carStatus === 'Open'
  const btnText = isOpen ? '停止营业' : '开始营业'
  const btnColor = isOpen ? 0xE74C3C : 0x27AE60
  
  // 按钮背景
  const bg = pixiManager.createGraphics()
  bg.beginFill(btnColor, 0.9)
  bg.drawRoundedRect(btnX, btnY, btnWidth, btnHeight, 16)
  bg.endFill()
  bg.lineStyle(1, 0x000000, 0.1)
  bg.drawRoundedRect(btnX, btnY, btnWidth, btnHeight, 16)
  layer.addChild(bg)
  
  // 按钮文字
  const text = pixiManager.createText(btnText, {
    fontSize: 14,
    fontWeight: 'bold',
    fill: 0xFFFFFF
  })
  text.anchor.set(0.5)
  text.x = btnX + btnWidth / 2
  text.y = btnY + btnHeight / 2
  layer.addChild(text)
  
  // 保存按钮位置用于点击检测
  ui.shopStatusButton = {
    x: btnX,
    y: btnY,
    width: btnWidth,
    height: btnHeight
  }
}

function createIconButton(x, y, size, icon, label, color) {
  const PIXI = pixiManager.getPIXI()
  const container = new PIXI.Container()
  const labelHeight = 20
  
  // 按钮背景（小方框）
  const bg = pixiManager.createGraphics()
  // 阴影
  bg.beginFill(0x000000, 0.2)
  bg.drawRoundedRect(0, 3, size, size, 10)
  bg.endFill()
  // 主体
  bg.beginFill(color)
  bg.drawRoundedRect(0, 0, size, size, 10)
  bg.endFill()
  
  container.addChild(bg)
  
  // 图标
  const iconText = pixiManager.createText(icon, { fontSize: 24 })
  iconText.anchor.set(0.5)
  iconText.x = size / 2
  iconText.y = size / 2
  container.addChild(iconText)
  
  // 文字标签（在按钮下方）
  const labelText = pixiManager.createText(label, {
    fontSize: 12,
    fontWeight: 'bold',
    fill: 0xFFFFFF
  })
  labelText.anchor.set(0.5, 0)
  labelText.x = size / 2
  labelText.y = size + 4
  container.addChild(labelText)
  
  container.x = x
  container.y = y
  
  return container
}

wx.onTouchStart(e => {
  const touch = e.touches[0]
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  
  let handled = false
  
  // 检查调试助手触发区域和按钮
  if (debugHelper.checkTrigger(touchStartX, touchStartY)) {
    handled = true
  } else if (debugHelper.handleClick(touchStartX, touchStartY)) {
    handled = true
  } else if (cookbookUI.isVisible() && cookbookUI.handleTouch(touchStartX, touchStartY)) {
    handled = true
  } else if (researchUI.isVisible() && researchUI.handleTouch(touchStartX, touchStartY)) {
    handled = true
  } else if (coffeeSelector.isVisible() && coffeeSelector.handleTouch(touchStartX, touchStartY)) {
    handled = true
  } else if (mapUI.isVisible() && mapUI.handleTouch(touchStartX, touchStartY)) {
    handled = true
  } else if (ui.topButtons) {
    for (const btn of ui.topButtons) {
      if (pixiManager.hitTest(touchStartX, touchStartY, btn)) {
        handleTopButtonClick(btn.id)
        handled = true
        break
      }
    }
  }
  
  if (!handled && ui.buttons) {
    for (const btn of ui.buttons) {
      if (pixiManager.hitTest(touchStartX, touchStartY, btn)) {
        handleMainButtonClick(btn.id)
        handled = true
        break
      }
    }
  }
  
  // 检查营业/停止营业按钮点击
  if (!handled && ui.shopStatusButton) {
    if (pixiManager.hitTest(touchStartX, touchStartY, ui.shopStatusButton)) {
      handleShopStatusButtonClick()
      handled = true
    }
  }
  
  // 检查存钱罐点击
  if (!handled && moneyJar.hasCoins()) {
    if (moneyJar.hitTest(touchStartX, touchStartY)) {
      handleMoneyJarClick()
      handled = true
    }
  }
  
  if (handled) {
    markDirty()  // 触摸交互后标记需要重绘
  }
})

function handleTopButtonClick(id) {
  switch (id) {
    case 'settings':
      wx.showToast({
        title: '设置功能开发中',
        icon: 'none'
      })
      break
    case 'shop':
      wx.showToast({
        title: '商店功能开发中',
        icon: 'none'
      })
      break
  }
  markDirty()  // UI 状态变化后标记需要重绘
}

function handleMainButtonClick(id) {
  switch (id) {
    case 'travel':
      mapUI.show()
      break
    case 'sell':
      // 如果店铺已营业，提示先停止营业
      if (gameState.getCarStatus() === 'Open') {
        wx.showToast({
          title: '请先停止营业再编辑菜单',
          icon: 'none'
        })
        return
      }
      coffeeSelector.show()
      break
    case 'cookbook':
      cookbookUI.show()
      break
    case 'research':
      researchUI.show()
      break
    case 'message':
      wx.showToast({
        title: '留言板功能开发中',
        icon: 'none'
      })
      break
  }
  markDirty()  // UI 状态变化后标记需要重绘
}

function handleShopStatusButtonClick() {
  const carStatus = gameState.getCarStatus()
  
  if (carStatus === 'Open') {
    // 停止营业
    gameState.closeShop()
    gameState.setShopOpenTime(null)
    moneyJar.setShopOpenTime(null)
    wx.showToast({
      title: '营业已停止',
      icon: 'none'
    })
  } else {
    // 开始营业 - 显示菜单选择页面
    coffeeSelector.show()
  }
  markDirty()
}

function handleMoneyJarClick() {
  const coins = moneyJar.collect()
  if (coins > 0) {
    gameState.addCoins(coins)
    wx.showToast({
      title: `获得 ${coins} 金币`,
      icon: 'none'
    })
    markDirty()
  }
}

// 检查是否需要自动停止营业（每10秒检查一次）
let lastAutoCheckTime = 0
function checkAutoCloseShop() {
  const now = Date.now()
  if (now - lastAutoCheckTime < 10000) return // 10秒检查一次
  lastAutoCheckTime = now
  
  if (gameState.isShopOpenMaxTime()) {
    console.log(`[自动休息] 营业已满8小时，自动停止营业`)
    
    // 自动收集金币
    const coins = moneyJar.collect()
    if (coins > 0) {
      gameState.addCoins(coins)
      wx.showToast({
        title: `营业8小时，获得 ${coins} 金币`,
        icon: 'none',
        duration: 3000
      })
    }
    
    gameState.closeShop()
    gameState.setShopOpenTime(null)
    moneyJar.setShopOpenTime(null)
    markDirty()
  }
}

gameState.onChange((key, value, oldValue) => {
  markDirty()  // 游戏状态变化后标记需要重绘
})

wx.onHide(() => {
  // 获取当前选择的咖啡列表
  const selectedCoffees = coffeeSelector.getSelectedCoffeeIds()
  gameState.setMenuCoffees(selectedCoffees)
  
  // 保存游戏状态（包含退出时间戳和营业开始时间）
  gameState.save()
  cookbookDataManager.saveUnlockProgress()
})

gameState.load()

// 计算并打印离线时长，初始化存钱罐离线金币
const lastExitTime = gameState.lastExitTime
const shopOpenTime = gameState.getShopOpenTime()

if (lastExitTime && shopOpenTime) {
  // 上次退出时正在营业，计算营业时长
  const openTime = new Date(shopOpenTime)
  const now = new Date()
  const elapsedMs = now - openTime
  const elapsedHours = elapsedMs / (1000 * 60 * 60)
  
  console.log(`[营业时长] 开始营业: ${openTime.toLocaleString()}, 已营业: ${elapsedHours.toFixed(2)} 小时`)
  
  // 计算离线金币（基于营业开始时间）
  const offlineCoins = moneyJar.calculateOfflineCoins(shopOpenTime, lastExitTime)
  if (offlineCoins > 0) {
    console.log(`[离线金币] 获得 ${offlineCoins} 金币，点击存钱罐领取`)
  }
  
  // 检查是否超过8小时，自动停止营业
  if (elapsedHours >= 8) {
    console.log(`[自动休息] 营业已满8小时，自动停止营业`)
    gameState.closeShop()
    // 清空存钱罐，金币已自动发放
    moneyJar.setShopOpenTime(null)
  } else {
    // 继续营业，初始化存钱罐
    moneyJar.init(shopOpenTime)
  }
} else if (shopOpenTime) {
  // 有营业开始时间但没有退出时间（异常情况）
  const openTime = new Date(shopOpenTime)
  const now = new Date()
  const elapsedHours = (now - openTime) / (1000 * 60 * 60)
  
  if (elapsedHours >= 8) {
    console.log(`[自动休息] 营业已满8小时，自动停止营业`)
    gameState.closeShop()
    moneyJar.setShopOpenTime(null)
  } else {
    moneyJar.init(shopOpenTime)
  }
} else {
  console.log('[营业状态] 店铺当前处于休息状态')
  moneyJar.setShopOpenTime(null)
}

// 加载保存的咖啡选择
coffeeSelector.loadSavedSelection(gameState.getMenuCoffees())

initGame()
