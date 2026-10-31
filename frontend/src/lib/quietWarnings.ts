/**
 * @react-three/fiber 9 still creates a THREE.Clock for every <Canvas> (fixed in fiber 10), and
 * three.js r183+ warns about it on each canvas. It is harmless and not from our code, so only
 * that exact message is dropped; every other warning still shows.
 * Remove this file once @react-three/fiber uses THREE.Timer.
 */
const QUIET = ['THREE.Clock: This module has been deprecated']

const warn = console.warn.bind(console)
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && QUIET.some((q) => (args[0] as string).includes(q))) return
  warn(...args)
}
