<?php

namespace App\Services;

/**
 * SqlParserService
 *
 * Parses a raw MySQL/MariaDB SQL dump and extracts:
 * - Tables with their columns (name, type, nullable, default, PK, UNIQUE)
 * - Foreign key relationships (FK constraints)
 *
 * Strategy: regex-based structural parsing (no IA needed here).
 * The AI layer (Phase 8) will enrich this output later.
 */
class SqlParserService
{
    /**
     * Parse a raw SQL string and return the domain model.
     *
     * @param  string  $sql  Raw SQL content
     * @return array{tables: array, relations: array, raw_table_count: int, raw_column_count: int}
     */
    public function parse(string $sql): array
    {
        $sql = $this->normalize($sql);

        $tables    = $this->extractTables($sql);
        $this->extractAlterTables($sql, $tables);
        $relations = $this->buildRelations($tables);

        $rawColumnCount = array_sum(array_map(fn ($t) => count($t['columns']), $tables));

        return [
            'tables'           => $tables,
            'relations'        => $relations,
            'raw_table_count'  => count($tables),
            'raw_column_count' => $rawColumnCount,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Normalize the SQL: strip comments and collapse whitespace.
     */
    private function normalize(string $sql): string
    {
        // Remove single-line comments (-- ...)
        $sql = preg_replace('/--[^\r\n]*/', '', $sql);
        // Remove multi-line comments (/* ... */)
        $sql = preg_replace('/\/\*.*?\*\//s', '', $sql);
        // Collapse multiple spaces/newlines to a single space
        $sql = preg_replace('/\s+/', ' ', $sql);

        return trim($sql);
    }

    /**
     * Extract all CREATE TABLE blocks and parse their contents.
     *
     * @return array<int, array{name: string, columns: array}>
     */
    private function extractTables(string $sql): array
    {
        $tables = [];

        // Match: CREATE TABLE `name` ( ... ) ...;
        $pattern = '/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"\']?(\w+)[`"\']?\s*\((.+?)\)\s*(?:ENGINE|DEFAULT|COMMENT|;|$)/is';

        preg_match_all($pattern, $sql, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $tableName = strtolower($match[1]);
            $body      = $match[2];

            // Skip internal Laravel tables
            if (in_array($tableName, ['migrations', 'personal_access_tokens', 'jobs', 'failed_jobs', 'cache', 'cache_locks'], true)) {
                continue;
            }

            $columns = $this->parseColumns($body, $tableName);

            $tables[] = [
                'name'    => $tableName,
                'columns' => $columns,
            ];
        }

        return $tables;
    }

    /**
     * Extract foreign keys defined via ALTER TABLE statements and merge them into the parsed tables.
     */
    private function extractAlterTables(string $sql, array &$tables): void
    {
        // Pattern: ALTER TABLE `table_name` ADD [CONSTRAINT `fk_name`] FOREIGN KEY (`col`) REFERENCES `ref_table` (`ref_col`)
        $pattern = '/ALTER\s+TABLE\s+[`"\']?(\w+)[`"\']?\s+ADD\s+(?:CONSTRAINT\s+[`"\']?\w+[`"\']?\s+)?FOREIGN\s+KEY\s*\([`"\']?(\w+)[`"\']?\)\s+REFERENCES\s+[`"\']?(\w+)[`"\']?\s*\([`"\']?(\w+)[`"\']?\)/is';
        
        preg_match_all($pattern, $sql, $matches, PREG_SET_ORDER);
        
        foreach ($matches as $match) {
            $tableName = strtolower($match[1]);
            $colName   = strtolower($match[2]);
            $refTable  = strtolower($match[3]);
            $refCol    = strtolower($match[4]);
            
            foreach ($tables as &$table) {
                if ($table['name'] === $tableName) {
                    foreach ($table['columns'] as &$column) {
                        if ($column['name'] === $colName) {
                            $column['is_foreign'] = true;
                            $column['references_table'] = $refTable;
                            $column['references_column'] = $refCol;
                            // Break out of both loops once found
                            break 2;
                        }
                    }
                }
            }
        }
    }

    /**
     * Parse column definitions and constraints from a CREATE TABLE body.
     *
     * @return array<int, array{
     *   name: string, type: string, nullable: bool, default: string|null,
     *   is_primary: bool, is_unique: bool, is_foreign: bool,
     *   references_table: string|null, references_column: string|null
     * }>
     */
    private function parseColumns(string $body, string $tableName): array
    {
        $columns = [];

        // Detect PRIMARY KEY columns from table-level constraint: PRIMARY KEY (`col1`, `col2`)
        $primaryKeys = [];
        if (preg_match('/PRIMARY\s+KEY\s*\(([^)]+)\)/i', $body, $pkMatch)) {
            preg_match_all('/[`"\']?(\w+)[`"\']?/', $pkMatch[1], $pkCols);
            $primaryKeys = array_map('strtolower', $pkCols[1]);
        }

        // Detect UNIQUE keys: UNIQUE KEY `name` (`col`)
        $uniqueColumns = [];
        preg_match_all('/UNIQUE\s+(?:KEY\s+[`"\']?\w+[`"\']?\s*)?\(([^)]+)\)/i', $body, $uniqueMatches);
        foreach ($uniqueMatches[1] as $uGroup) {
            preg_match_all('/[`"\']?(\w+)[`"\']?/', $uGroup, $uCols);
            foreach ($uCols[1] as $uCol) {
                $uniqueColumns[] = strtolower($uCol);
            }
        }

        // Detect FOREIGN KEY constraints:
        // FOREIGN KEY (`col`) REFERENCES `table` (`ref_col`)
        $foreignKeys = [];
        $fkPattern = '/FOREIGN\s+KEY\s*\([`"\']?(\w+)[`"\']?\)\s+REFERENCES\s+[`"\']?(\w+)[`"\']?\s*\([`"\']?(\w+)[`"\']?\)/i';
        preg_match_all($fkPattern, $body, $fkMatches, PREG_SET_ORDER);
        foreach ($fkMatches as $fk) {
            $foreignKeys[strtolower($fk[1])] = [
                'references_table'  => strtolower($fk[2]),
                'references_column' => strtolower($fk[3]),
            ];
        }

        // Split lines by comma — but only top-level commas (not inside parentheses)
        $lines = $this->splitTopLevelCommas($body);

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) {
                continue;
            }

            // Skip constraint lines (already processed above)
            if (preg_match('/^(PRIMARY\s+KEY|UNIQUE|KEY|INDEX|FOREIGN\s+KEY|CONSTRAINT)/i', $line)) {
                continue;
            }

            // Match column definition: `name` TYPE [NOT NULL] [DEFAULT ...] [AUTO_INCREMENT] ...
            $colPattern = '/^[`"\']?(\w+)[`"\']?\s+([a-z]+(?:\([^)]*\))?(?:\s+unsigned)?(?:\s+zerofill)?)/i';
            if (!preg_match($colPattern, $line, $colMatch)) {
                continue;
            }

            $colName = strtolower($colMatch[1]);
            $colType = strtolower(trim($colMatch[2]));

            // Detect nullable
            $nullable = true;
            if (preg_match('/NOT\s+NULL/i', $line)) {
                $nullable = false;
            }

            // Detect AUTO_INCREMENT / inline PK
            $inlinePk = (bool) preg_match('/AUTO_INCREMENT|PRIMARY\s+KEY/i', $line);

            // Detect UNIQUE inline
            $inlineUnique = (bool) preg_match('/\bUNIQUE\b/i', $line);

            // Detect DEFAULT value
            $default = null;
            if (preg_match('/DEFAULT\s+([^\s,]+)/i', $line, $defMatch)) {
                $default = trim($defMatch[1], "'\"");
            }

            $isPrimary = $inlinePk || in_array($colName, $primaryKeys, true);
            $isUnique  = $inlineUnique || in_array($colName, $uniqueColumns, true);
            $isForeign = isset($foreignKeys[$colName]);

            $columns[] = [
                'name'              => $colName,
                'type'              => $colType,
                'nullable'          => $nullable,
                'default'           => $default,
                'is_primary'        => $isPrimary,
                'is_unique'         => $isUnique || $isPrimary,
                'is_foreign'        => $isForeign,
                'references_table'  => $foreignKeys[$colName]['references_table'] ?? null,
                'references_column' => $foreignKeys[$colName]['references_column'] ?? null,
            ];
        }

        return $columns;
    }

    /**
     * Build relationship objects from foreign key data across all tables.
     *
     * @param  array  $tables
     * @return array<int, array{from_table: string, from_column: string, to_table: string, to_column: string, type: string}>
     */
    private function buildRelations(array $tables): array
    {
        $relations = [];

        // Build a set of table names for quick lookup
        $tableNames = array_column($tables, 'name');

        foreach ($tables as $table) {
            foreach ($table['columns'] as $column) {
                if (!$column['is_foreign'] || $column['references_table'] === null) {
                    continue;
                }

                // Only add if referenced table exists in the parsed result
                if (!in_array($column['references_table'], $tableNames, true)) {
                    continue;
                }

                $type = $column['is_unique'] ? '1:1' : '1:N';

                $relations[] = [
                    'from_table'    => $table['name'],
                    'from_column'   => $column['name'],
                    'to_table'      => $column['references_table'],
                    'to_column'     => $column['references_column'],
                    'type'          => $type,
                ];
            }
        }

        return $relations;
    }

    /**
     * Split a string by top-level commas (ignoring commas inside parentheses).
     *
     * @return array<int, string>
     */
    private function splitTopLevelCommas(string $str): array
    {
        $parts  = [];
        $depth  = 0;
        $current = '';

        for ($i = 0, $len = strlen($str); $i < $len; $i++) {
            $char = $str[$i];
            if ($char === '(') {
                $depth++;
                $current .= $char;
            } elseif ($char === ')') {
                $depth--;
                $current .= $char;
            } elseif ($char === ',' && $depth === 0) {
                $parts[]  = $current;
                $current  = '';
            } else {
                $current .= $char;
            }
        }

        if ($current !== '') {
            $parts[] = $current;
        }

        return $parts;
    }
}
