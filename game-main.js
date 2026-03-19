// game-main.js - 游戏主逻辑

const { gameState, CarStatus } = require('./managers/gameState')
const { dataLoader } = require('./managers/dataLoader')
const { cookbookDataManager } = require('./ui/cookbook/cookbookDataManager')
const { CookbookUI } = require('./ui/cookbook/cookbookUI')
const { ResearchUI } = require('./ui/researchUI')
const { CoffeeSelector } = require('./ui/coffeeSelector')
const { pixiManager } = require('./managers/pixiManager')

const sysInfo = wx.getSystemInfoSync()
const screenWidth = sysInfo.windowWidth
const screenHeight = sysInfo.windowHeight

console.log(`Screen: ${screenWidth}x${screenHeight}`)

let canvas = null
let touchStartX = 0
let touchStartY = 0

const cookbookUI = new CookbookUI(screenWidth, screenHeight)
const researchUI = new ResearchUI(screenWidth, screenHeight)
const coffeeSelector = new CoffeeSelector(screenWidth, screenHeight)

let isGameReady = false
let errorMessage = null

const bgImages = {
  day: null,
  night: null
}

const statusIcons = {
  bill: null,
  diamond: null
}

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
  console.log('Starting game initialization...')
  
  if (!(await pixiManager.init())) {
    console.error('Failed to initialize PixiJS')
    errorMessage = 'Failed to initialize graphics engine'
    return
  }
  
  canvas = pixiManager.getApp().canvas
  canvas.getContext('2d')
  
  bgImages.day = await loadTexture('data/sprites/bg/day_bg.png')
  bgImages.night = await loadTexture('data/sprites/bg/day_bg_2.png')
  console.log('Background images loaded')
  
  try {
    statusIcons.bill = await loadTexture('data/sprites/icons/bill.png')
    statusIcons.diamond = await loadTexture('data/sprites/icons/diamond.png')
    console.log('Status icons loaded')
  } catch (e) {
    console.warn('Status icons loading failed:', e)
  }
  
  dataLoader.onProgress((progress, file) => {
    console.log(`Loading: ${progress}% - ${file}`)
  })
  
  dataLoader.onComplete(data => {
    console.log('Data loading complete:', Object.keys(data))
    
    if (data.cookbook) {
      cookbookDataManager.parseData(data.cookbook)
      cookbookDataManager.loadUnlockProgress()
      cookbookUI.initData(cookbookDataManager)
      console.log('Cookbook data initialized')
    }
    
    if (data.recipes) {
      researchUI.setRecipesData(data.recipes)
      cookbookUI.setRecipesData(data.recipes)
      console.log('Recipes data loaded')
    }
    
    isGameReady = true
    console.log('Game is ready!')
  })
  
  dataLoader.onError(err => {
    console.error('Data loading error:', err)
    errorMessage = err.message || 'Failed to load game data'
    cookbookDataManager.loadEmbeddedData()
    cookbookDataManager.loadUnlockProgress()
    cookbookUI.initData(cookbookDataManager)
    isGameReady = true
  })
  
  dataLoader.loadAllData()
  
  researchUI.setOnResearchComplete(result => {
    console.log('Research completed:', result)
    if (result.success && result.recipe) {
      cookbookDataManager.addCoffeeFromRecipe(result.recipe)
      wx.showToast({
        title: `Unlocked: ${result.recipe.name}`,
        icon: 'success'
      })
    }
  })
  
  coffeeSelector.setOnConfirm(coffees => {
    console.log('Selected coffees for sale:', coffees)
    wx.showToast({
      title: `Selling ${coffees.length} coffee(s)`,
      icon: 'none'
    })
  })
  
  coffeeSelector.setOnCancel(() => {
    console.log('Coffee selection cancelled')
  })
  
  startGameLoop()
}

function startGameLoop() {
  pixiManager.getApp().ticker.add(() => {
    render()
  })
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
}

function drawLoadingScreen() {
  const layer = pixiManager.getLayer('overlay')
  const PIXI = pixiManager.getPIXI()
  
  const bg = pixiManager.createGraphics().rect(0, 0, screenWidth, screenHeight).fill(0x2C3E50)
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
  barBg.roundRect(barX, barY, barWidth, barHeight, 5)
  barBg.fill(0x34495E)
  layer.addChild(barBg)
  
  const fillWidth = progress / 100 * barWidth
  const barFill = pixiManager.createGraphics()
  barFill.roundRect(barX, barY, fillWidth, barHeight, 5)
  barFill.fill(0x3498DB)
  layer.addChild(barFill)
}

function drawErrorScreen() {
  const layer = pixiManager.getLayer('overlay')
  const bg = pixiManager.createGraphics().rect(0, 0, screenWidth, screenHeight).fill(0x2C3E50)
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
  const bgImage = dateTime.isDaytime ? bgImages.day : bgImages.night
  
  if (bgImage) {
    const sprite = pixiManager.createSprite(bgImage)
    sprite.width = screenWidth
    sprite.height = screenHeight
    layer.addChild(sprite)
  } else {
    const color = dateTime.isDaytime ? 0x87CEEB : 0x2C3E50
    const bg = pixiManager.createGraphics().rect(0, 0, screenWidth, screenHeight).fill(color)
    layer.addChild(bg)
  }
}

function drawTopButtons() {
  const layer = pixiManager.getLayer('ui')
  const btnSize = 44
  const btnGap = 10
  const startX = screenWidth - btnSize - 15
  const startY = 15
  
  const buttons = [
    { id: 'cookbook', icon: '📖', x: startX, y: startY },
    { id: 'research', icon: '🔬', x: startX - btnSize - btnGap, y: startY }
  ]
  
  ui.topButtons = []
  
  buttons.forEach(btn => {
    const bg = pixiManager.createGraphics()
    bg.roundRect(btn.x, btn.y, btnSize, btnSize, 8)
    bg.fill({ color: 0xFFFFFF, alpha: 0.9 })
    bg.stroke({ color: 0x000000, width: 1, alpha: 0.1 })
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
  bg.roundRect(x, y, barWidth, barHeight, 10)
  bg.fill({ color: 0xFFFFFF, alpha: 0.9 })
  bg.stroke({ color: 0x000000, width: 1, alpha: 0.1 })
  layer.addChild(bg)
  
  const items = [
    { icon: '💰', value: gameState.getCoins(), x: x + 15 },
    { icon: '💎', value: gameState.getRubies(), x: x + barWidth * 0.4 }
  ]
  
  items.forEach(item => {
    const icon = pixiManager.createText(item.icon, { fontSize: 20 })
    icon.anchor.set(0, 0.5)
    icon.x = item.x
    icon.y = y + barHeight / 2
    layer.addChild(icon)
    
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
}

function drawMainButtons() {
  const layer = pixiManager.getLayer('ui')
  const btnWidth = (screenWidth - 60) / 2
  const btnHeight = 50
  const btnY = screenHeight - btnHeight - 30
  
  const buttons = [
    { id: 'travel', text: '🚗 Travel', color: 0x3498DB, x: 20 },
    { id: 'sell', text: '☕ Sell Coffee', color: 0xE67E22, x: 30 + btnWidth }
  ]
  
  ui.buttons = []
  
  buttons.forEach(btn => {
    const container = createButton(btn.x, btnY, btnWidth, btnHeight, btn.text, btn.color)
    layer.addChild(container)
    ui.buttons.push({
      id: btn.id,
      x: btn.x,
      y: btnY,
      width: btnWidth,
      height: btnHeight
    })
  })
}

function createButton(x, y, width, height, text, color) {
  const PIXI = pixiManager.getPIXI()
  const container = new PIXI.Container()
  
  const bg = pixiManager.createGraphics()
  bg.roundRect(0, 0, width, height, 10)
  bg.fill(color)
  
  bg.roundRect(0, 4, width, height, 10)
  bg.fill({ color: 0x000000, alpha: 0.2 })
  
  bg.roundRect(0, 0, width, height, 10)
  bg.fill(color)
  
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

wx.onTouchStart(e => {
  const touch = e.touches[0]
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  
  if (cookbookUI.isVisible() && cookbookUI.handleTouch(touchStartX, touchStartY)) {
    return
  }
  
  if (researchUI.isVisible() && researchUI.handleTouch(touchStartX, touchStartY)) {
    return
  }
  
  if (coffeeSelector.isVisible() && coffeeSelector.handleTouch(touchStartX, touchStartY)) {
    return
  }
  
  if (ui.topButtons) {
    for (const btn of ui.topButtons) {
      if (pixiManager.hitTest(touchStartX, touchStartY, btn)) {
        handleTopButtonClick(btn.id)
        return
      }
    }
  }
  
  if (ui.buttons) {
    for (const btn of ui.buttons) {
      if (pixiManager.hitTest(touchStartX, touchStartY, btn)) {
        handleMainButtonClick(btn.id)
        return
      }
    }
  }
})

function handleTopButtonClick(id) {
  console.log('Top button clicked:', id)
  switch (id) {
    case 'cookbook':
      cookbookUI.show()
      break
    case 'research':
      researchUI.show()
      break
  }
}

function handleMainButtonClick(id) {
  console.log('Main button clicked:', id)
  switch (id) {
    case 'travel':
      const city = gameState.travelToNext()
      wx.showToast({
        title: `Traveled to ${city}`,
        icon: 'none'
      })
      break
    case 'sell':
      coffeeSelector.show()
      break
  }
}

gameState.onChange((key, value, oldValue) => {
  console.log(`Game state changed: ${key} = ${value}`)
})

wx.onHide(() => {
  console.log('App hidden, saving game state...')
  gameState.save()
  cookbookDataManager.saveUnlockProgress()
})

gameState.load()
initGame()

console.log('Game main loaded')
