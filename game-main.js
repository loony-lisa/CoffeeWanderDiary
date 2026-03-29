// game-main.js - 游戏主逻辑

const { RESOURCES } = require('./config')
const { gameState, CarStatus } = require('./managers/gameState')
const { dataLoader } = require('./managers/dataLoader')
const { cookbookDataManager } = require('./ui/cookbook/cookbookDataManager')
const { CookbookUI } = require('./ui/cookbook/cookbookUI')
const { ResearchUI } = require('./ui/researchUI')
const { CoffeeSelector } = require('./ui/coffeeSelector')
const { MapUI } = require('./ui/mapUI')
const { pixiManager } = require('./managers/pixiManager')

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
  bill: null,
  diamond: null
}

// 精灵图动画
let bgNightAnimeSprite = null
let bgNightAnimeFrames = []
let bgNightAnimeFrameIndex = 0
let bgNightAnimeLastFrameTime = 0
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
  
  bgImages.day = await loadTexture(RESOURCES.background('day_bg'))
  bgImages.night = await loadTexture(RESOURCES.background('night_bg'))
  bgImages.dayClose = await loadTexture(RESOURCES.background('day_bg_close'))
  bgImages.nightClose = await loadTexture(RESOURCES.background('night_bg_close'))

  statusIcons.coin = await loadTexture(RESOURCES.icon('coin'))
  statusIcons.ruby = await loadTexture(RESOURCES.icon('ruby'))
  
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
    
    isGameReady = true
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
    gameState.openShop()
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
    // 从 OSS 加载精灵图
    const OSS_URL = RESOURCES.anime('beach_day')
    const spriteSheetTexture = await loadTexture(OSS_URL)
    
    if (!spriteSheetTexture) {
      console.warn('Sprite sheet texture is null, skipping animation load')
      return
    }
    
    const PIXI = pixiManager.getPIXI()
    const frames = []
    
    // 雪碧图布局：每帧 512x384，横向排列，共 20 帧
    // 根据这个规律直接生成帧数据
    for (let i = 0; i < 20; i++) {
      const x = i * 512
      const y = 0
      const w = 512
      const h = 384
      
      // 从雪碧图创建子纹理
      const frameTexture = new PIXI.Texture(
        spriteSheetTexture.baseTexture,
        new PIXI.Rectangle(x, y, w, h)
      )
      frames.push(frameTexture)
    }
    
    bgNightAnimeFrames = frames
    console.log(`Loaded ${frames.length} frames for bg_night_anime`)
  } catch (e) {
    console.warn('Failed to load bg_night_anime frames:', e)
    bgNightAnimeFrames = []
  }
}

function updateBgNightAnime() {
  if (bgNightAnimeFrames.length === 0) return
  
  const now = Date.now()
  if (now - bgNightAnimeLastFrameTime >= BG_NIGHT_ANIME_FRAME_DURATION) {
    bgNightAnimeFrameIndex = (bgNightAnimeFrameIndex + 1) % bgNightAnimeFrames.length
    bgNightAnimeLastFrameTime = now
    
    // 更新精灵纹理
    if (bgNightAnimeSprite) {
      bgNightAnimeSprite.texture = bgNightAnimeFrames[bgNightAnimeFrameIndex]
    }
  }
}

function startGameLoop() {
  const app = pixiManager.getApp()
  
  app.ticker.add(() => {
    frameCount++
    
    // 更新精灵图动画（每帧都更新，不跳过）
    updateBgNightAnime()
    
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
  if (bgNightAnimeFrames.length === 0) return
  
  const layer = pixiManager.getLayer('background')
  
  // 如果精灵不存在或已被销毁（被 clearAllLayers 销毁），重新创建
  if (!bgNightAnimeSprite || bgNightAnimeSprite._destroyed) {
    bgNightAnimeSprite = pixiManager.createSprite(bgNightAnimeFrames[0])
    bgNightAnimeSprite.anchor.set(0.5)  // 设置锚点为中心
  }
  
  // 更新当前帧
  bgNightAnimeSprite.texture = bgNightAnimeFrames[bgNightAnimeFrameIndex]
  
  // 计算位置：页面正当中
  bgNightAnimeSprite.x = screenWidth / 2
  bgNightAnimeSprite.y = screenHeight / 2
  
  // 可选：缩放以适应屏幕（保持宽高比）
  const scaleX = screenWidth / 512
  const scaleY = screenHeight / 384
  const scale = Math.min(scaleX, scaleY) * 0.8  // 缩放为屏幕的80%
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

function drawShopStatusButton() {
  const layer = pixiManager.getLayer('ui')
  const carStatus = gameState.getCarStatus()
  
  // 按钮位置和尺寸
  const btnWidth = 90
  const btnHeight = 32
  const btnX = screenWidth - btnWidth - 15
  const btnY = 75  // 在状态栏下方
  
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

function createButton(x, y, width, height, text, color) {
  const PIXI = pixiManager.getPIXI()
  const container = new PIXI.Container()
  
  const bg = pixiManager.createGraphics()
  bg.beginFill(color)
  bg.drawRoundedRect(0, 0, width, height, 10)
  bg.endFill()
  
  bg.beginFill(0x000000, 0.2)
  bg.drawRoundedRect(0, 4, width, height, 10)
  bg.endFill()
  
  bg.beginFill(color)
  bg.drawRoundedRect(0, 0, width, height, 10)
  bg.endFill()
  
  container.addChild(bg)
  
  const label = pixiManager.createText(text, {
    fontSize: 16,
    fontWeight: 'bold',
    fill: 0xFFFFFF
  })
  label.anchor.set(0.5)
  label.x = width / 2
  label.y = height / 2
  container.addChild(label)
  
  container.x = x
  container.y = y
  
  return container
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
  
  if (cookbookUI.isVisible() && cookbookUI.handleTouch(touchStartX, touchStartY)) {
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

gameState.onChange((key, value, oldValue) => {
  markDirty()  // 游戏状态变化后标记需要重绘
})

wx.onHide(() => {
  gameState.save()
  cookbookDataManager.saveUnlockProgress()
})

gameState.load()
initGame()
