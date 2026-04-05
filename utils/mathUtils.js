// utils/mathUtils.js - Math Utility Functions

/**
 * Get the next power of two for a given number
 * Used for WebGL texture sizing (NPOT texture support)
 * @param {number} n - Input number
 * @returns {number} Next power of two
 */
function getNextPowerOfTwo(n) {
  if (n <= 1) return 1
  if ((n & (n - 1)) === 0) return n // Already a power of two
  return Math.pow(2, Math.ceil(Math.log2(n)))
}

module.exports = {
  getNextPowerOfTwo
}
