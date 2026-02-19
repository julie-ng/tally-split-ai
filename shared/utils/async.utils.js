function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const asyncUtils = { sleep }
