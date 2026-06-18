'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  ControlButton,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Maximize, Minimize } from 'lucide-react'
import TableNode from './TableNode'
import type { SqlParseResult } from '@/lib/types'

const nodeTypes = {
  tableNode: TableNode,
}

export default function SchemaDiagram({ result }: { result: SqlParseResult }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const graphRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement)
      }
      document.addEventListener('fullscreenchange', handleFullscreenChange)
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      graphRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  const initialNodes: Node[] = useMemo(() => {
    return result.tables.map((table, index) => {
      // Basic grid layout: 3 columns
      const col = index % 3
      const row = Math.floor(index / 3)
      return {
        id: table.name,
        type: 'tableNode',
        position: { x: col * 350 + 50, y: row * 300 + 50 },
        data: { table },
      }
    })
  }, [result])

  const initialEdges: Edge[] = useMemo(() => {
    return result.relations.map((rel, index) => ({
      id: `e-${rel.from_table}-${rel.to_table}-${index}`,
      source: rel.from_table,
      sourceHandle: 'source',
      target: rel.to_table,
      targetHandle: 'target',
      animated: true,
      type: 'smoothstep',
      style: { stroke: '#FF2D20', strokeWidth: 2 },
    }))
  }, [result])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div ref={graphRef} className="w-full h-full bg-[#09090B] rounded-lg border border-zinc-800 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        className="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#27272A" />
        <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400">
          <ControlButton onClick={toggleFullscreen} title="Pantalla Completa">
            {isFullscreen ? <Minimize className="w-4 h-4 text-zinc-400" /> : <Maximize className="w-4 h-4 text-zinc-400" />}
          </ControlButton>
        </Controls>
      </ReactFlow>
    </div>
  )
}
