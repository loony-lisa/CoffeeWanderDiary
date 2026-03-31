// managers/gameState.js - Game State Management Module

// Define coffee truck status enum
const CarStatus = {
  OPEN: 'Open',
  CLOSED: 'Closed'
}

// Define list of accessible cities
const Cities = [
  'Beijing',
  'Shanghai',
  'Guangzhou',
  'Shenzhen',
  'Chengdu',
  'Hangzhou',
  'Xi\'an',
  'Xiamen'
]

// Game state class
class GameState {
  constructor() {
    // Currency system
    this.coins = 0        // Number of coins
    this.rubies = 0       // Number of rubies
    
    // Coffee truck status
    this.carStatus = CarStatus.CLOSED  // Default closed
    
    // Location info
    this.currentCity = Cities[0]       // Default Beijing
    
    // Date and time system
    this.currentDate = this.getCurrentDate()  // Current date
    this.currentTime = this.getCurrentTime()  // Current time
    this.isDaytime = this.checkIsDaytime()    // Whether it's daytime (8:00-18:00)
    
    // Data change listeners (for UI updates)
    this.listeners = []
    
    // Start time update timer
    this.startTimeUpdate()
  }

  // ========== Date and Time System ==========
  
  // Get current date (YYYY-MM-DD format)
  getCurrentDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Get current time (HH:MM format)
  getCurrentTime() {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
  
  // Check if it's daytime (8:00 - 18:00)
  checkIsDaytime() {
    const now = new Date()
    const hour = now.getHours()
    return hour >= 8 && hour < 18
  }
  
  // Update time
  updateTime() {
    const newDate = this.getCurrentDate()
    const newTime = this.getCurrentTime()
    const newIsDaytime = this.checkIsDaytime()
    
    // Check if there are changes
    const dateChanged = newDate !== this.currentDate
    const timeChanged = newTime !== this.currentTime
    const daytimeChanged = newIsDaytime !== this.isDaytime
    
    if (dateChanged || timeChanged || daytimeChanged) {
      this.currentDate = newDate
      this.currentTime = newTime
      this.isDaytime = newIsDaytime
      
      this._notifyChange('time', {
        date: this.currentDate,
        time: this.currentTime,
        isDaytime: this.isDaytime
      })
      
      // Daytime changed, background will be updated by listener
    }
  }
  
  // Start time update timer (update every minute)
  startTimeUpdate() {
    // Update immediately once
    this.updateTime()
    
    // Update every minute
    this.timeUpdateInterval = setInterval(() => {
      this.updateTime()
    }, 60000) // 60000ms = 1 minute
  }
  
  // Stop time update
  stopTimeUpdate() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval)
      this.timeUpdateInterval = null
    }
  }
  
  // Get date and time info
  getDateTime() {
    return {
      date: this.currentDate,
      time: this.currentTime,
      isDaytime: this.isDaytime
    }
  }

  // ========== Coin Operations ==========
  
  // Add coins
  addCoins(amount) {
    this.coins += amount
    this._notifyChange('coins', this.coins)
    return this.coins
  }

  // Spend coins
  spendCoins(amount) {
    if (this.coins >= amount) {
      this.coins -= amount
      this._notifyChange('coins', this.coins)
      return true
    }
    return false  // Insufficient balance
  }

  // Get coin count
  getCoins() {
    return this.coins
  }

  // ========== Ruby Operations ==========
  
  // Add rubies
  addRubies(amount) {
    this.rubies += amount
    this._notifyChange('rubies', this.rubies)
    return this.rubies
  }

  // Spend rubies
  spendRubies(amount) {
    if (this.rubies >= amount) {
      this.rubies -= amount
      this._notifyChange('rubies', this.rubies)
      return true
    }
    return false
  }

  // Get ruby count
  getRubies() {
    return this.rubies
  }

  // ========== Coffee Truck Status Operations ==========
  
  // Open shop
  openShop() {
    this.carStatus = CarStatus.OPEN
    this._notifyChange('carStatus', this.carStatus)
    return this.carStatus
  }

  // Close shop
  closeShop() {
    this.carStatus = CarStatus.CLOSED
    this._notifyChange('carStatus', this.carStatus)
    return this.carStatus
  }

  // Toggle shop status
  toggleShop() {
    if (this.carStatus === CarStatus.OPEN) {
      return this.closeShop()
    } else {
      return this.openShop()
    }
  }

  // Get coffee truck status
  getCarStatus() {
    return this.carStatus
  }

  // Whether shop is open
  isOpen() {
    return this.carStatus === CarStatus.OPEN
  }

  // ========== City Operations ==========
  
  // Travel to specified city
  travelTo(cityName) {
    if (Cities.includes(cityName)) {
      this.currentCity = cityName
      this._notifyChange('currentCity', this.currentCity)
      return true
    }
    return false  // City doesn't exist
  }

  // Travel to next city
  travelToNext() {
    const currentIndex = Cities.indexOf(this.currentCity)
    const nextIndex = (currentIndex + 1) % Cities.length
    this.currentCity = Cities[nextIndex]
    this._notifyChange('currentCity', this.currentCity)
    return this.currentCity
  }

  // Get current city
  getCurrentCity() {
    return this.currentCity
  }

  // Get all accessible cities
  getAvailableCities() {
    return [...Cities]
  }

  // ========== Data Listener ==========
  
  // Add state change listener
  onChange(callback) {
    this.listeners.push(callback)
  }

  // Remove listener
  offChange(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback)
  }

  // Notify all listeners
  _notifyChange(key, value) {
    this.listeners.forEach(callback => {
      callback(key, value, this)
    })
  }

  // ========== Menu Coffee Selection ==========
  // Used for save data before onHide
  // Set selected menu coffees
  setMenuCoffees(coffeeIds) {
    this.menuCoffees = coffeeIds || []
  }
  
  // Get selected menu coffees
  getMenuCoffees() {
    return this.menuCoffees || []
  }

  // ========== Data Persistence ==========
  
  // Save to local storage
  save() {
    const data = {
      coins: this.coins,
      rubies: this.rubies,
      carStatus: this.carStatus,
      currentCity: this.currentCity,
      menuCoffees: this.menuCoffees || [],
      lastExitTime: new Date().toISOString()
    }
    wx.setStorageSync('gameState', data)
    console.log('Game state saved:', data)
  }

  // Load from local storage
  load() {
    try {
      const data = wx.getStorageSync('gameState')
      if (data) {
        this.coins = data.coins || 0
        this.rubies = data.rubies || 0
        this.carStatus = data.carStatus || CarStatus.CLOSED
        this.currentCity = data.currentCity || Cities[0]
        this.menuCoffees = data.menuCoffees || []
        this.lastExitTime = data.lastExitTime || null
        console.log('Game state loaded:', this.getState())
        return true
      }
    } catch (e) {
      console.error('Failed to load game state:', e)
    }
    return false
  }

  // ========== Utility Methods ==========
  
  // Get full state (for debugging or display)
  getState() {
    return {
      coins: this.coins,
      rubies: this.rubies,
      carStatus: this.carStatus,
      currentCity: this.currentCity,
      menuCoffees: this.menuCoffees || [],
      lastExitTime: this.lastExitTime || null
    }
  }

  // Reset game
  reset() {
    this.coins = 0
    this.rubies = 0
    this.carStatus = CarStatus.CLOSED
    this.currentCity = Cities[0]
    this._notifyChange('reset', this.getState())
  }
}

// Export singleton instance and enums
module.exports = {
  gameState: new GameState(),
  CarStatus,
  Cities
}
