import HTMLElement from './HTMLElement'

export class HTMLImageElement extends HTMLElement {
  constructor() {
    super('img')
  }
}

export class HTMLCanvasElement extends HTMLElement {
  constructor() {
    super('canvas')
  }
}

// 为 PixiJS v8 提供 CanvasRenderingContext2D 类定义
// 微信小游戏中通过 canvas.getContext('2d') 获取的上下文对象
export class CanvasRenderingContext2D {
  constructor() {
    // 这是一个占位类，实际的上下文对象由微信小游戏创建
    // PixiJS v8 使用这个类进行 instanceof 检查
    throw new Error('CanvasRenderingContext2D cannot be instantiated directly. Use canvas.getContext("2d").')
  }
}

// 为 PixiJS v8 提供 WebGLRenderingContext 类定义
export class WebGLRenderingContext {
  constructor() {
    throw new Error('WebGLRenderingContext cannot be instantiated directly. Use canvas.getContext("webgl").')
  }
}
