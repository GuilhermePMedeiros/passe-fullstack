import { beforeEach, vi } from 'vitest'
import { configure } from '@testing-library/react'

configure({ asyncUtilTimeout: 5000 })

beforeEach(() => {
  if (typeof window === 'undefined') return

  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  vi.stubGlobal('PointerEvent', window.MouseEvent)
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
  window.HTMLElement.prototype.setPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
})
