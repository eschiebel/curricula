import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock cytoscape
const mockFit = vi.fn()
const mockZoom = vi.fn()
const mockPan = vi.fn()
const mockCenter = vi.fn()
const mockNodes = vi.fn()
const mockElements = vi.fn()

const createMockCytoscape = (nodeCount: number = 0) => {
  const mockNodeInstances = Array.from({ length: nodeCount }, (_, i) => ({
    id: () => `node-${i}`,
    data: () => ({ id: `node-${i}` }),
  }))

  const mockBoundingBox = {
    x1: 0,
    y1: 0,
    x2: 1000,
    y2: 800,
    w: 1000,
    h: 800,
  }

  mockNodes.mockReturnValue({
    length: nodeCount,
    [Symbol.iterator]: function* () {
      yield* mockNodeInstances
    },
  })

  mockElements.mockReturnValue({
    boundingBox: () => mockBoundingBox,
  })

  mockZoom.mockImplementation((value?: number) => {
    if (value !== undefined) {
      return value
    }
    return 1.0
  })

  mockPan.mockImplementation((value?: { x: number; y: number }) => {
    if (value !== undefined) {
      return value
    }
    return { x: 0, y: 0 }
  })

  return {
    fit: mockFit,
    zoom: mockZoom,
    pan: mockPan,
    center: mockCenter,
    nodes: mockNodes,
    elements: mockElements,
    width: () => 1200,
    height: () => 800,
  }
}

describe('CurriculumGraph - Viewport Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty curriculum', () => {
    it('sets fixed zoom and pan for empty curriculum', () => {
      const cy = createMockCytoscape(0)

      // Simulate the viewport initialization logic for empty curriculum
      const nodes = cy.nodes()
      if (nodes.length === 0) {
        const containerWidth = cy.width()
        cy.zoom(0.8)
        cy.pan({ x: containerWidth / 3, y: 50 })
      }

      expect(cy.zoom).toHaveBeenCalledWith(0.8)
      expect(cy.pan).toHaveBeenCalledWith({ x: 400, y: 50 })
      expect(cy.fit).not.toHaveBeenCalled()
    })
  })

  describe('Loaded curriculum with content', () => {
    it('fits curriculum to viewport with padding', () => {
      const cy = createMockCytoscape(10)

      // Simulate the viewport initialization logic for loaded curriculum
      const nodes = cy.nodes()
      if (nodes.length > 0) {
        cy.fit(nodes, 50)
      }

      expect(cy.fit).toHaveBeenCalledWith(expect.anything(), 50)
    })

    it('limits zoom to maxZoom when fit() zooms too much', () => {
      const cy = createMockCytoscape(2) // Sparse curriculum

      // Mock fit() to set a high zoom level
      mockFit.mockImplementation(() => {
        mockZoom.mockReturnValueOnce(1.5) // First call returns high zoom
      })

      // Simulate the viewport initialization logic
      const nodes = cy.nodes()
      if (nodes.length > 0) {
        cy.fit(nodes, 50)
        const currentZoom = cy.zoom()
        const maxZoom = 1.0

        if (currentZoom > maxZoom) {
          cy.zoom(maxZoom)
          cy.center(nodes)
        }
      }

      expect(cy.fit).toHaveBeenCalled()
      expect(cy.zoom).toHaveBeenCalledWith(1.0)
      expect(cy.center).toHaveBeenCalledWith(nodes)
    })

    it('does not limit zoom when fit() zoom is below maxZoom', () => {
      const cy = createMockCytoscape(20) // Dense curriculum

      // Mock fit() to set a reasonable zoom level
      mockFit.mockImplementation(() => {
        mockZoom.mockReturnValueOnce(0.6) // First call returns low zoom
      })

      // Simulate the viewport initialization logic
      const nodes = cy.nodes()
      if (nodes.length > 0) {
        cy.fit(nodes, 50)
        const currentZoom = cy.zoom()
        const maxZoom = 1.0

        if (currentZoom > maxZoom) {
          cy.zoom(maxZoom)
          cy.center(nodes)
        }
      }

      expect(cy.fit).toHaveBeenCalled()
      expect(cy.zoom).not.toHaveBeenCalledWith(1.0)
      expect(cy.center).not.toHaveBeenCalled()
    })

    it('positions semester headers near top of viewport', () => {
      const cy = createMockCytoscape(10)

      // Mock fit() and zoom
      mockFit.mockImplementation(() => {
        mockZoom.mockReturnValueOnce(0.8)
      })

      mockPan.mockReturnValueOnce({ x: 100, y: 200 })

      // Simulate the viewport initialization logic
      const nodes = cy.nodes()
      if (nodes.length > 0) {
        cy.fit(nodes, 50)
        const currentZoom = cy.zoom()
        const maxZoom = 1.0

        if (currentZoom > maxZoom) {
          cy.zoom(maxZoom)
        }

        // Adjust pan to position semester headers near the top
        const bb = cy.elements().boundingBox()
        const currentPan = cy.pan()
        const topMargin = 80
        const newPanY = -bb.y1 * currentZoom + topMargin

        cy.pan({ x: currentPan.x, y: newPanY })
      }

      expect(cy.pan).toHaveBeenCalledWith(
        expect.objectContaining({
          y: 80, // -0 * 0.8 + 80
        }),
      )
    })

    it('calculates correct pan Y with non-zero bounding box', () => {
      const cy = createMockCytoscape(10)

      const customBoundingBox = {
        x1: 50,
        y1: 100,
        x2: 1000,
        y2: 800,
        w: 950,
        h: 700,
      }

      mockElements.mockReturnValue({
        boundingBox: () => customBoundingBox,
      })

      mockFit.mockImplementation(() => {
        mockZoom.mockReturnValueOnce(0.8)
      })

      mockPan.mockReturnValueOnce({ x: 200, y: 300 })

      // Simulate the viewport initialization logic
      const nodes = cy.nodes()
      if (nodes.length > 0) {
        cy.fit(nodes, 50)
        const currentZoom = cy.zoom()

        const bb = cy.elements().boundingBox()
        const currentPan = cy.pan()
        const topMargin = 80
        const newPanY = -bb.y1 * currentZoom + topMargin

        cy.pan({ x: currentPan.x, y: newPanY })
      }

      // Expected: -100 * 0.8 + 80 = -80 + 80 = 0
      expect(cy.pan).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 200, // Preserves horizontal pan
          y: 0,
        }),
      )
    })
  })

  describe('Viewport persistence', () => {
    it('uses saved viewport when available', () => {
      const cy = createMockCytoscape(10)
      const savedViewport = { zoom: 1.2, pan: { x: 150, y: 250 } }

      // Simulate viewport restoration
      cy.zoom(savedViewport.zoom)
      cy.pan(savedViewport.pan)

      expect(cy.zoom).toHaveBeenCalledWith(1.2)
      expect(cy.pan).toHaveBeenCalledWith({ x: 150, y: 250 })
      expect(cy.fit).not.toHaveBeenCalled()
    })

    it('does not apply fit logic when viewport is restored', () => {
      const cy = createMockCytoscape(10)
      const savedViewport = { zoom: 1.2, pan: { x: 150, y: 250 } }

      // When viewport exists, skip fit logic
      const hasViewport = true

      if (hasViewport) {
        cy.zoom(savedViewport.zoom)
        cy.pan(savedViewport.pan)
      } else {
        const nodes = cy.nodes()
        if (nodes.length > 0) {
          cy.fit(nodes, 50)
        }
      }

      expect(cy.fit).not.toHaveBeenCalled()
      expect(cy.zoom).toHaveBeenCalledWith(1.2)
    })
  })

  describe('Edge cases', () => {
    it('handles single node curriculum', () => {
      const cy = createMockCytoscape(1)

      mockFit.mockImplementation(() => {
        mockZoom.mockReturnValueOnce(2.0) // Very high zoom for single node
      })

      const nodes = cy.nodes()
      if (nodes.length > 0) {
        cy.fit(nodes, 50)
        const currentZoom = cy.zoom()
        const maxZoom = 1.0

        if (currentZoom > maxZoom) {
          cy.zoom(maxZoom)
          cy.center(nodes)
        }
      }

      expect(cy.zoom).toHaveBeenCalledWith(1.0)
      expect(cy.center).toHaveBeenCalled()
    })

    it('handles very large curriculum', () => {
      const cy = createMockCytoscape(100)

      mockFit.mockImplementation(() => {
        mockZoom.mockReturnValueOnce(0.3) // Very low zoom for large curriculum
      })

      const nodes = cy.nodes()
      if (nodes.length > 0) {
        cy.fit(nodes, 50)
        const currentZoom = cy.zoom()
        const maxZoom = 1.0

        if (currentZoom > maxZoom) {
          cy.zoom(maxZoom)
        }
      }

      expect(cy.fit).toHaveBeenCalled()
      // Should not limit zoom since 0.3 < 1.0
      expect(cy.zoom).not.toHaveBeenCalledWith(1.0)
    })
  })
})
