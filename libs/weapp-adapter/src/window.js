import Canvas from './Canvas'

export document from './document'
export navigator from './navigator'
export XMLHttpRequest from './XMLHttpRequest'
export WebSocket from './WebSocket'
export Image from './Image'
export Audio from './Audio'
export FileReader from './FileReader'
export HTMLElement from './HTMLElement'
export localStorage from './localStorage'
export location from './location'
export * from './WindowProperties'
export * from './constructor'

// 暴露全局的 canvas
const canvas = new Canvas()

export { canvas }

// 将全局函数绑定到本地常量
const _setTimeout = setTimeout;
const _setInterval = setInterval;
const _clearTimeout = clearTimeout;
const _clearInterval = clearInterval;
const _requestAnimationFrame = requestAnimationFrame;
const _cancelAnimationFrame = cancelAnimationFrame;

export { _setTimeout as setTimeout };
export { _setInterval as setInterval };
export { _clearTimeout as clearTimeout };
export { _clearInterval as clearInterval };
export { _requestAnimationFrame as requestAnimationFrame };
export { _cancelAnimationFrame as cancelAnimationFrame };