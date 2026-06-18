import { Handle, Position } from '@xyflow/react'
import { Key, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ParsedTable } from '@/lib/types'

export default function TableNode({ data }: { data: { table: ParsedTable } }) {
  const { table } = data

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl w-[260px] overflow-hidden font-mono text-sm">
      {/* Target Handle */}
      <Handle 
        id="target"
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-zinc-600 border-2 border-zinc-900"
      />

      {/* Header */}
      <div className="bg-[#27272A]/50 px-3 py-2 border-b border-[#27272A] flex items-center justify-between">
        <span className="font-semibold text-zinc-100">{table.name}</span>
      </div>

      {/* Columns */}
      <div className="p-2 space-y-0.5">
        {table.columns.map((col) => (
          <div 
            key={col.name} 
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
              col.is_foreign ? "bg-laravel-red/5 border border-laravel-red/10" : ""
            )}
          >
            {col.is_primary ? (
              <Key className="w-3.5 h-3.5 text-warning-amber flex-shrink-0" />
            ) : col.is_foreign ? (
              <LinkIcon className="w-3.5 h-3.5 text-laravel-red flex-shrink-0" />
            ) : (
              <span className="w-3.5" />
            )}
            
            <span className={cn(
              "flex-1 truncate",
              col.is_primary ? "text-zinc-100 font-semibold" : 
              col.is_foreign ? "text-laravel-red font-semibold" : 
              "text-zinc-300"
            )}>
              {col.name}
            </span>
            
            <span className="text-zinc-500 truncate max-w-[80px]">
              {col.type}
            </span>
          </div>
        ))}
      </div>

      {/* Source Handle */}
      <Handle 
        id="source"
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-laravel-red border-2 border-zinc-900"
      />
    </div>
  )
}
