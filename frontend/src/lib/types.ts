'use client'

// ─── Types shared across the application ─────────────────────────────────────

/** Project stored in the DB */
export interface Project {
  id: number
  name: string
  laravel_version: string
  installation_type: string
  created_at: string
  updated_at: string
}

/** A single column parsed from a SQL file */
export interface ParsedColumn {
  name: string
  type: string          // e.g. "varchar(255)", "bigint unsigned", "text"
  nullable: boolean
  default: string | null
  is_primary: boolean
  is_unique: boolean
  is_foreign: boolean
  references_table: string | null
  references_column: string | null
}

/** A single table parsed from a SQL file */
export interface ParsedTable {
  name: string
  columns: ParsedColumn[]
}

/** A detected relationship between two tables */
export interface ParsedRelation {
  from_table: string
  from_column: string
  to_table: string
  to_column: string
  type: '1:1' | '1:N' | 'N:M'
}

/** Full result returned by the SQL parser endpoint */
export interface SqlParseResult {
  tables: ParsedTable[]
  relations: ParsedRelation[]
  raw_table_count: number
  raw_column_count: number
  architecture_recommendations?: string[]
}

/** An uploaded file record */
export interface UploadedFileRecord {
  id: number
  project_id: number
  file_type: 'sql' | 'image' | 'pdf'
  original_name: string
  stored_path: string
  parse_result: SqlParseResult | null
  created_at: string
}
