<?php

namespace App\Services;

use Illuminate\Support\Str;

class ModelBuilderService
{
    /**
     * Transforms raw SQL parsed tables and relations into an Eloquent-oriented Domain Model.
     *
     * @param array $tables
     * @param array $relations
     * @return array
     */
    public function build(array $tables, array $relations): array
    {
        $models = [];
        $pivots = [];

        // Map table names to model names (using AI suggested model_name if available)
        $tableToModelMap = [];
        foreach ($tables as $table) {
            $tableToModelMap[$table['name']] = $table['model_name'] ?? Str::studly(Str::singular($table['name']));
        }

        // 1. Identify pivot tables
        foreach ($tables as $table) {
            if ($this->isPivotTable($table, $relations)) {
                $pivots[$table['name']] = $table;
            }
        }

        // 2. Build Models
        foreach ($tables as $table) {
            if (isset($pivots[$table['name']])) {
                continue; // Skip pivot tables as standard models
            }

            $modelName = $tableToModelMap[$table['name']];
            
            $attributes = [];
            foreach ($table['columns'] as $col) {
                $attributes[] = [
                    'name'     => $col['name'],
                    'type'     => $col['type'],
                    'nullable' => $col['nullable'],
                    'fillable' => $this->isFillable($col['name'], $col['is_primary']),
                    'primary'  => $col['is_primary'],
                ];
            }

            $modelRelations = $this->buildModelRelations($table['name'], $relations, $pivots, $tableToModelMap);

            $models[] = [
                'model_name'        => $modelName,
                'table_name'        => $table['name'],
                'is_pivot'          => false,
                'attributes'        => $attributes,
                'relations'         => $modelRelations,
                'model_description' => $table['model_description'] ?? '',
            ];
        }

        return $models;
    }

    /**
     * Determine if a column should be included in the $fillable array.
     */
    private function isFillable(string $colName, bool $isPrimary): bool
    {
        if ($isPrimary) {
            return false; // Primary keys are usually guarded (auto-increment)
        }

        $guarded = ['id', 'created_at', 'updated_at', 'deleted_at', 'remember_token'];
        return !in_array(strtolower($colName), $guarded, true);
    }

    /**
     * Identifies if a table acts as a pivot table for a Many-to-Many relationship.
     * Rule: Must have exactly 2 foreign keys and no other data columns (except PK and timestamps).
     */
    private function isPivotTable(array $table, array $relations): bool
    {
        // Find all relations originating from this table
        $tableRelations = array_filter($relations, fn($r) => $r['from_table'] === $table['name']);
        
        if (count($tableRelations) !== 2) {
            return false;
        }

        // Check if there are other columns besides the two foreign keys, primary keys, and timestamps
        $fkColumns = array_column($tableRelations, 'from_column');
        $allowed = array_merge($fkColumns, ['id', 'created_at', 'updated_at']);
        
        foreach ($table['columns'] as $col) {
            if (!in_array($col['name'], $allowed, true)) {
                return false; // Found a data column, probably not a pure pivot
            }
        }

        return true;
    }

    /**
     * Build the Eloquent relationship definitions for a given table.
     */
    private function buildModelRelations(string $tableName, array $relations, array $pivots, array $tableToModelMap): array
    {
        $modelRels = [];

        // 1. belongsTo (Foreign keys defined in this table)
        foreach ($relations as $rel) {
            if ($rel['from_table'] === $tableName) {
                $relatedModel = $tableToModelMap[$rel['to_table']] ?? Str::studly(Str::singular($rel['to_table']));
                $modelRels[] = [
                    'type'          => 'belongsTo',
                    'related_model' => $relatedModel,
                    'related_table' => $rel['to_table'],
                    'foreign_key'   => $rel['from_column'],
                    'local_key'     => $rel['to_column'],
                ];
            }
        }

        // 2. hasMany / hasOne (Foreign keys defined in other non-pivot tables pointing to this table)
        foreach ($relations as $rel) {
            if ($rel['to_table'] === $tableName && !isset($pivots[$rel['from_table']])) {
                $relatedModel = $tableToModelMap[$rel['from_table']] ?? Str::studly(Str::singular($rel['from_table']));
                $relType = $rel['type'] === '1:1' ? 'hasOne' : 'hasMany';
                $modelRels[] = [
                    'type'          => $relType,
                    'related_model' => $relatedModel,
                    'foreign_key'   => $rel['from_column'],
                    'local_key'     => $rel['to_column'],
                ];
            }
        }

        // 3. belongsToMany (via Pivot tables)
        foreach ($pivots as $pivotName => $pivotTable) {
            // Get the 2 relations of the pivot
            $pivotRels = array_values(array_filter($relations, fn($r) => $r['from_table'] === $pivotName));
            if (count($pivotRels) !== 2) continue;

            $relA = $pivotRels[0];
            $relB = $pivotRels[1];

            if ($relA['to_table'] === $tableName) {
                $relatedModel = $tableToModelMap[$relB['to_table']] ?? Str::studly(Str::singular($relB['to_table']));
                $modelRels[] = [
                    'type'              => 'belongsToMany',
                    'related_model'     => $relatedModel,
                    'pivot_table'       => $pivotName,
                    'foreign_pivot_key' => $relA['from_column'],
                    'related_pivot_key' => $relB['from_column'],
                ];
            } elseif ($relB['to_table'] === $tableName) {
                $relatedModel = $tableToModelMap[$relA['to_table']] ?? Str::studly(Str::singular($relA['to_table']));
                $modelRels[] = [
                    'type'              => 'belongsToMany',
                    'related_model'     => $relatedModel,
                    'pivot_table'       => $pivotName,
                    'foreign_pivot_key' => $relB['from_column'],
                    'related_pivot_key' => $relA['from_column'],
                ];
            }
        }

        return $modelRels;
    }
}
