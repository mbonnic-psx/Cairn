import { describe, expect, it } from 'vitest'
import config from '../../../src-tauri/tauri.conf.json'

describe('the window the application opens in', () => {
  const win = config.app.windows[0]

  it('opens at 1280 by 800', () => {
    expect(win.width).toBe(1280)
    expect(win.height).toBe(800)
  })

  it('keeps its minimum size at 800 by 600', () => {
    expect(win.minWidth).toBe(800)
    expect(win.minHeight).toBe(600)
  })
})
