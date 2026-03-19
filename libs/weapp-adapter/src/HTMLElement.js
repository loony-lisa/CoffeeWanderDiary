import Element from './Element'
import { noop } from './util/index.js'
import { innerWidth, innerHeight } from './WindowProperties'

export default class HTMLElement extends Element {
  className = ''
  childern = []
  style = {
    width: `${innerWidth}px`,
    height: `${innerHeight}px`
  }

  insertBefore = noop

  innerHTML = ''

  constructor(tagName = '') {
    super()
    this.tagName = tagName.toUpperCase()
  }

  setAttribute(name, value) {
    this[name] = value
  }

  getAttribute(name) {
    return this[name]
  }

  get clientWidth() {
    const ret = parseInt(this.style.fontSize, 10) * this.innerHTML.length

    return Number.isNaN(ret) ? 0 : ret
  }

  get clientHeight() {
    const ret = parseInt(this.style.fontSize, 10)

    return Number.isNaN(ret) ? 0 : ret
  }

  getBoundingClientRect() {
    return {
      top: 0,
      left: 0,
      width: innerWidth,
      height: innerHeight
    }
  }

  focus() {
    
  }

  remove() {
    // 微信小程序环境中没有真正的 DOM，此方法为空实现
    // 用于兼容 PixiJS v8 等库的 DOMPipe 调用
  }
}
