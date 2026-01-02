import { useState } from 'preact/hooks'
import { CytoscapeGraph } from './components/CytoscapeGraph'
import './app.css'

type NodeData = {
  id: string
  label: string
}

type EdgeData = {
  id: string
  source: string
  target: string
  label?: string
}

export function App() {
  // Sample data for the graph
  const [nodes] = useState<NodeData[]>([
    { id: '1', label: 'Node 1' },
    { id: '2', label: 'Node 2' },
    { id: '3', label: 'Node 3' },
    { id: '4', label: 'Node 4' },
  ])

  const [edges] = useState<EdgeData[]>([
    { id: 'e1', source: '1', target: '2', label: 'to' },
    { id: 'e2', source: '2', target: '3', label: 'to' },
    { id: 'e3', source: '3', target: '4', label: 'to' },
    { id: 'e4', source: '4', target: '1', label: 'to' },
    { id: 'e5', source: '1', target: '3', label: 'to' },
  ])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Curricula</h1>
        <p className="text-gray-600">Interactive curriculum visualization with Cytoscape</p>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Curriculum Graph</h2>
          <CytoscapeGraph nodes={nodes} edges={edges} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium mb-3">About</h3>
            <p className="text-gray-700">
              This is a sample application demonstrating the integration of Cytoscape.js with Preact
              and Vite. The graph above shows a simple circular connection between nodes.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium mb-3">Features</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Interactive graph visualization</li>
              <li>Responsive design</li>
              <li>TypeScript support</li>
              <li>Testing setup with Vitest</li>
              <li>Code formatting with Biome</li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>Built with Vite, Preact, and Cytoscape</p>
      </footer>
    </div>
  )
}
