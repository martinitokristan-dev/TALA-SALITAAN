import * as THREE from 'three'

/*
 * Textures drawn on a canvas at runtime, so the map works offline
 * (no image downloads) and still looks like real stone, grass and soil.
 */

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function finish(canvas: HTMLCanvasElement, repeat: [number, number]): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat[0], repeat[1])
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Cut stone blocks with mortar lines (castle walls). */
function draw_stoneTexture(repeat: [number, number] = [1, 1]): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const rand = rng(7)
  g.fillStyle = '#6f6a62'
  g.fillRect(0, 0, 256, 256)
  const rowH = 32
  for (let r = 0; r < 8; r++) {
    const offset = r % 2 ? 0 : 26
    for (let x = -52; x < 256; x += 52) {
      const light = 62 + rand() * 14
      g.fillStyle = `hsl(${32 + rand() * 10}, ${10 + rand() * 8}%, ${light}%)`
      g.fillRect(x + offset + 2, r * rowH + 2, 48, rowH - 4)
      // top highlight and bottom shade give each block some depth
      g.fillStyle = 'rgba(255,255,255,0.18)'
      g.fillRect(x + offset + 2, r * rowH + 2, 48, 3)
      g.fillStyle = 'rgba(0,0,0,0.16)'
      g.fillRect(x + offset + 2, r * rowH + rowH - 5, 48, 3)
    }
  }
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '0,0,0'},${0.05 + rand() * 0.08})`
    g.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2, 1 + rand() * 2)
  }
  return finish(c, repeat)
}

/** Meadow grass (ground and island tops). */
function draw_grassTexture(repeat: [number, number] = [1, 1]): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const rand = rng(21)
  g.fillStyle = '#5fae46'
  g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${rand() > 0.5 ? '120,200,90' : '60,130,50'},0.25)`
    g.beginPath()
    g.arc(rand() * 256, rand() * 256, 10 + rand() * 30, 0, Math.PI * 2)
    g.fill()
  }
  for (let i = 0; i < 2600; i++) {
    const x = rand() * 256
    const y = rand() * 256
    g.strokeStyle = `hsl(${95 + rand() * 25}, ${45 + rand() * 20}%, ${30 + rand() * 25}%)`
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (rand() - 0.5) * 3, y - 3 - rand() * 4)
    g.stroke()
  }
  return finish(c, repeat)
}

/* ── Toy-building textures (Mario-style world map buildings) ── */

/** Vertical candy stripes (circus tent). */
function draw_stripeTexture(a: string, b: string, count = 16): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 64
  const g = c.getContext('2d')!
  const w = c.width / count
  for (let i = 0; i < count; i++) {
    g.fillStyle = i % 2 ? b : a
    g.fillRect(i * w, 0, w + 1, 64)
  }
  // soft shading at the stripe edges so they read as fabric folds
  for (let i = 0; i < count; i++) {
    const grad = g.createLinearGradient(i * w, 0, (i + 1) * w, 0)
    grad.addColorStop(0, 'rgba(0,0,0,0.10)')
    grad.addColorStop(0.5, 'rgba(255,255,255,0.06)')
    grad.addColorStop(1, 'rgba(0,0,0,0.10)')
    g.fillStyle = grad
    g.fillRect(i * w, 0, w, 64)
  }
  return finish(c, [1, 1])
}

/** Toy letter block face: coloured border, white panel, big letter. */
function draw_letterTexture(letter: string, color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = color
  g.fillRect(0, 0, 256, 256)
  g.fillStyle = '#fffaf0'
  g.beginPath()
  g.roundRect(26, 26, 204, 204, 30)
  g.fill()
  g.fillStyle = color
  g.font = '900 170px "Arial Black", Arial, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(letter, 128, 140)
  return finish(c, [1, 1])
}

/** Little landscape picture for the Tuklas-Larawan billboard. */
function draw_pictureTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 192
  const g = c.getContext('2d')!
  const sky = g.createLinearGradient(0, 0, 0, 192)
  sky.addColorStop(0, '#7fd3ff')
  sky.addColorStop(1, '#d8f3ff')
  g.fillStyle = sky
  g.fillRect(0, 0, 256, 192)
  g.fillStyle = '#ffcf3f'
  g.beginPath()
  g.arc(196, 52, 26, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#5cbf48'
  g.beginPath()
  g.moveTo(0, 192)
  g.lineTo(0, 130)
  g.lineTo(70, 70)
  g.lineTo(130, 130)
  g.lineTo(175, 95)
  g.lineTo(256, 150)
  g.lineTo(256, 192)
  g.fill()
  g.fillStyle = '#3f9d34'
  g.fillRect(0, 160, 256, 32)
  return finish(c, [1, 1])
}

/** Speech bubble sign for Tuklas-Sitwasyon. */
function draw_bubbleTexture(text: string, color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, 512, 256)
  g.fillStyle = color
  g.font = '900 120px "Arial Black", Arial, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  // shrink to fit so no letter is cut off
  const w = g.measureText(text).width
  if (w > 460) g.font = `900 ${Math.floor((120 * 460) / w)}px "Arial Black", Arial, sans-serif`
  g.fillText(text, 256, 136)
  return finish(c, [1, 1])
}

/* Each texture is drawn once and reused, so going back to the map does not redraw thousands of grass strokes. */
const texCache = new Map<string, THREE.CanvasTexture>()
function memo<A extends unknown[]>(name: string, draw: (...a: A) => THREE.CanvasTexture) {
  return (...a: A): THREE.CanvasTexture => {
    const key = name + JSON.stringify(a)
    let t = texCache.get(key)
    if (!t) {
      t = draw(...a)
      texCache.set(key, t)
    }
    return t
  }
}

export const stoneTexture = memo('stoneTexture', draw_stoneTexture)
export const grassTexture = memo('grassTexture', draw_grassTexture)
export const stripeTexture = memo('stripeTexture', draw_stripeTexture)
export const letterTexture = memo('letterTexture', draw_letterTexture)
export const pictureTexture = memo('pictureTexture', draw_pictureTexture)
export const bubbleTexture = memo('bubbleTexture', draw_bubbleTexture)
