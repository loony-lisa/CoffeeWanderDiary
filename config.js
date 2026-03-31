// config.js - 全局配置文件

// OSS 资源基础 URL
const OSS_BASE_URL = 'https://coffee-wander-diary-shanghai-a58yjceu96.oss-cn-shanghai.aliyuncs.com/v1.0.0'

// 资源路径配置
const RESOURCES = {
  // 咖啡图片
  coffee: (itemId) => `${OSS_BASE_URL}/image/coffee/${itemId}.png`,
  
  // 食材图片
  ingredient: (itemId) => `${OSS_BASE_URL}/image/ingredient/${itemId}.png`,
  
  // 图标
  icon: (name) => `${OSS_BASE_URL}/image/icon/${name}.png`,
  
  // 背景图
  background: (name) => `${OSS_BASE_URL}/image/background/${name}.png`,
  
  // 地图
  map: () => `${OSS_BASE_URL}/image/background/map.png`,

  // 动画
  anime: (name) => `${OSS_BASE_URL}/anime/${name}/frame_0001-sheet.png`,
  
  // 动画配置文件
  animeJson: (name) => `${OSS_BASE_URL}/anime/${name}/frame_0001.json`
}

module.exports = {
  OSS_BASE_URL,
  RESOURCES
}
