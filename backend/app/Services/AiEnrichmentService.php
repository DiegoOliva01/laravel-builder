<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * AiEnrichmentService
 *
 * Connects to OpenRouter API to enrich a parsed SQL schema with:
 * - Normalized naming (singular models, PascalCase, snake_case columns)
 * - Detection of implicit relationships not defined via FOREIGN KEY
 * - Laravel-convention corrections
 */
class AiEnrichmentService
{
    private string $apiKey;
    private string $model;
    private string $baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

    public function __construct()
    {
        $this->apiKey = config('services.openrouter.key');
        $this->model  = config('services.openrouter.model', 'meta-llama/llama-3.3-70b-instruct:free');
    }

    /**
     * Enrich a parsed SQL result using Gemini AI.
     *
     * @param  array  $parseResult  The result from SqlParserService::parse()
     * @return array                The enriched result with AI suggestions
     */
    public function enrich(array $parseResult, int $attempts = 3): array
    {
        $prompt = $this->buildPrompt($parseResult);

        for ($i = 0; $i < $attempts; $i++) {
            try {
                if ($i > 0) {
                    sleep($i * 2); // Espera progresiva para evitar límites de rate limit
                }

                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$this->apiKey}",
                    'HTTP-Referer'  => config('app.url'),
                    'X-Title'       => 'Laravel Builder',
                ])->timeout(60)->post($this->baseUrl, [
                    'model' => $this->model,
                    'messages' => [
                        [
                            'role'    => 'user',
                            'content' => $prompt,
                        ],
                    ],
                    'temperature' => 0.1,
                    'max_tokens'  => 8192,
                ]);

                if (!$response->successful()) {
                    Log::warning('OpenRouter API error (Enrichment)', [
                        'status' => $response->status(),
                        'body'   => $response->body(),
                        'attempt' => $i + 1
                    ]);
                    continue;
                }

                $body = $response->json();
                $text = $body['choices'][0]['message']['content'] ?? null;

                if (!$text) {
                    continue;
                }

                $text = $this->extractJson($text);
                $aiData = json_decode($text, true);

                if (json_last_error() !== JSON_ERROR_NONE || !is_array($aiData)) {
                    Log::warning('OpenRouter returned invalid JSON (Enrichment)', [
                        'error'   => json_last_error_msg(),
                        'attempt' => $i + 1
                    ]);
                    continue;
                }

                return $this->mergeAiSuggestions($parseResult, $aiData);

            } catch (\Exception $e) {
                Log::error('OpenRouter enrichment failed', [
                    'error' => $e->getMessage(),
                    'attempt' => $i + 1
                ]);
            }
        }

        return $this->fallbackResult($parseResult);
    }

    /**
     * Build the structured prompt to send to Gemini.
     * We only send table names (not columns) to minimize token usage.
     */
    private function buildPrompt(array $parseResult): string
    {
        // Only send table names — we don't need column details for naming/relation suggestions
        $tableNames = array_column($parseResult['tables'], 'name');
        $tableNamesJson = json_encode($tableNames);

        // Send only implicit-relation candidates: columns ending in _id that aren't already FK
        $implicitCandidates = [];
        $existingFkKeys = array_map(
            fn($r) => "{$r['from_table']}.{$r['from_column']}",
            $parseResult['relations']
        );
        foreach ($parseResult['tables'] as $table) {
            foreach ($table['columns'] as $col) {
                if (!$col['is_foreign'] && str_ends_with($col['name'], '_id')) {
                    $key = "{$table['name']}.{$col['name']}";
                    if (!in_array($key, $existingFkKeys)) {
                        $implicitCandidates[] = [
                            'table'  => $table['name'],
                            'column' => $col['name'],
                        ];
                    }
                }
            }
        }
        $candidatesJson = json_encode($implicitCandidates);

        return <<<PROMPT
You are a Laravel expert. Analyze these database table names and return naming suggestions.

## Table names:
{$tableNamesJson}

## Possible implicit FK columns (not yet defined as FOREIGN KEY):
{$candidatesJson}

Return ONLY a valid JSON object with this exact structure:
{
  "suggestions": [
    {"table_name": "original_name", "model_name": "SingularPascalCase", "description": "1 sentence describing the purpose of this model", "reason": "brief reason"}
  ],
  "implicit_relations": [
    {"from_table": "t1", "from_column": "col", "to_table": "t2", "to_column": "id", "type": "1:N", "confidence": "high", "reason": "brief reason"}
  ],
  "convention_warnings": [
    {"table_name": "name", "warning": "description"}
  ],
  "architecture_recommendations": [
    "string recommendation 1",
    "string recommendation 2"
  ]
}

Rules:
- Every table MUST have a suggestion with singular PascalCase model_name and a brief description.
- For implicit_relations: only include if confident the column references another table in the list.
- Respond ONLY with the JSON object, no markdown fences, no explanation.
- All text values returned in the JSON object (description, reason, warning, architecture_recommendations) MUST be written in Spanish (español).
- If the database table names are in Spanish, you MUST singularize them using proper Spanish grammar rules (do NOT use English inflection rules):
  * Tables ending in "es" (e.g. sucursales, proveedores, roles, devoluciones, promociones, detalles, clientes) -> singularize by removing the plural suffix to their correct singular consonant or vowel (e.g. Sucursal, Proveedor, Rol, Devolucion, Promocion, Detalle, Cliente). Do NOT write "Sucursale", "Proveedore", "Role", "Devolucione", "Promocione", etc.
  * Composite names like "tipos_cuenta" or "tipos_ajuste" -> singularize only the noun and head words correctly (e.g. TipoCuenta, TipoAjuste). Do NOT use Latin/English singular rules that yield "TiposCuentum" or similar nonsense.
PROMPT;
    }

    /**
     * Merge AI suggestions into the original parse result.
     */
    private function mergeAiSuggestions(array $parseResult, array $aiData): array
    {
        // Build a quick lookup: table_name => data
        $modelNameMap = [];
        $modelDescMap = [];
        foreach ($aiData['suggestions'] ?? [] as $suggestion) {
            $tableName = strtolower($suggestion['table_name']);
            $modelNameMap[$tableName] = $suggestion['model_name'];
            $modelDescMap[$tableName] = $suggestion['description'] ?? '';
        }

        // Apply model name suggestions to tables
        $tables = $parseResult['tables'];
        foreach ($tables as &$table) {
            $normalizedName = strtolower($table['name']);
            if (isset($modelNameMap[$normalizedName])) {
                $table['model_name'] = $modelNameMap[$normalizedName];
                $table['model_description'] = $modelDescMap[$normalizedName];
            } else {
                // Default fallback: StudlyCase the table name using our Spanish singularizer
                $table['model_name'] = $this->singularizeSpanish($table['name']);
                $table['model_description'] = "Modelo para la tabla {$table['name']}.";
            }
        }

        // Merge implicit relations (avoiding duplicates)
        $existingRelationKeys = array_map(
            fn($r) => "{$r['from_table']}.{$r['from_column']}",
            $parseResult['relations']
        );

        $implicitRelations = [];
        foreach ($aiData['implicit_relations'] ?? [] as $rel) {
            $key = "{$rel['from_table']}.{$rel['from_column']}";
            if (!in_array($key, $existingRelationKeys)) {
                $rel['source'] = 'ai'; // Mark as AI-detected
                $implicitRelations[] = $rel;
            }
        }

        return array_merge($parseResult, [
            'tables'                       => $tables,
            'ai_suggestions'               => $aiData['suggestions'] ?? [],
            'implicit_relations'           => $implicitRelations,
            'convention_warnings'          => $aiData['convention_warnings'] ?? [],
            'architecture_recommendations' => $aiData['architecture_recommendations'] ?? [],
            'ai_enriched'                  => true,
        ]);
    }

    /**
     * Return the original parse result unchanged when AI is unavailable.
     * Uses Spanish-aware singularization for model names.
     */
    private function fallbackResult(array $parseResult): array
    {
        $tables = $parseResult['tables'];
        foreach ($tables as &$table) {
            $table['model_name'] = $this->singularizeSpanish($table['name']);
            $table['model_description'] = "Modelo para la tabla {$table['name']}.";
        }

        return array_merge($parseResult, [
            'tables'                       => $tables,
            'ai_suggestions'               => [],
            'implicit_relations'           => [],
            'convention_warnings'          => [],
            'architecture_recommendations' => [],
            'ai_enriched'                  => false,
        ]);
    }

    /**
     * Convert a Spanish plural table name to a singular PascalCase model name.
     * Handles common Spanish pluralization rules.
     */
    private function singularizeSpanish(string $tableName): string
    {
        // Handle composite names like "detalle_ventas" → "DetalleVenta"
        $parts = explode('_', $tableName);
        $singularParts = array_map(function (string $word) {
            return $this->singularizeSpanishWord($word);
        }, $parts);

        return implode('', array_map('ucfirst', $singularParts));
    }

    /**
     * Singularize a single Spanish word.
     */
    private function singularizeSpanishWord(string $word): string
    {
        $word = strtolower($word);

        // Dictionary for irregular or tricky words
        $dictionary = [
            'clientes'              => 'cliente',
            'categorias'            => 'categoria',
            'proveedores'           => 'proveedor',
            'sucursales'            => 'sucursal',
            'productos'             => 'producto',
            'empleados'             => 'empleado',
            'ventas'                => 'venta',
            'compras'               => 'compra',
            'promociones'           => 'promocion',
            'devoluciones'          => 'devolucion',
            'roles'                 => 'rol',
            'usuarios'              => 'usuario',
            'tipos'                 => 'tipo',
            'ajustes'               => 'ajuste',
            'metodos'               => 'metodo',
            'detalles'              => 'detalle',
            'inventarios'           => 'inventario',
            'pedidos'               => 'pedido',
            'facturas'              => 'factura',
            'pagos'                 => 'pago',
            'permisos'              => 'permiso',
            'configuraciones'       => 'configuracion',
            'notificaciones'        => 'notificacion',
            'transacciones'         => 'transaccion',
            'movimientos'           => 'movimiento',
            'reportes'              => 'reporte',
            'archivos'              => 'archivo',
            'imagenes'              => 'imagen',
            'comentarios'           => 'comentario',
            'categorias'            => 'categoria',
            'direcciones'           => 'direccion',
            'telefonos'             => 'telefono',
        ];

        if (isset($dictionary[$word])) {
            return $dictionary[$word];
        }

        // Rule: ends in 'dores' → 'dor' (proveedores → proveedor)
        if (str_ends_with($word, 'dores')) {
            return substr($word, 0, -1); // remove 's'
        }

        // Rule: ends in 'iones' → 'ion' (devoluciones → devolucion, promociones → promocion)
        if (str_ends_with($word, 'ciones') || str_ends_with($word, 'siones')) {
            return substr($word, 0, -2); // remove 'es'
        }

        // Rule: ends in 'ales' → 'al' (sucursales → sucursal, animales → animal)
        if (str_ends_with($word, 'ales')) {
            return substr($word, 0, -2); // remove 'es'
        }

        // Rule: ends in 'eles' → 'el' (paneles → panel)
        if (str_ends_with($word, 'eles')) {
            return substr($word, 0, -2);
        }

        // Rule: ends in 'oles' → 'ol' (roles → rol, controles → control)
        if (str_ends_with($word, 'oles')) {
            return substr($word, 0, -2);
        }

        // Rule: ends in 'ores' → 'or' (sectores → sector)
        if (str_ends_with($word, 'ores') && !str_ends_with($word, 'flores')) {
            return substr($word, 0, -2);
        }

        // Rule: ends in 'eses' → 'es' (meses → mes)
        if (str_ends_with($word, 'eses')) {
            return substr($word, 0, -2);
        }

        // Regular 'es' ending after consonant → remove 'es'
        if (str_ends_with($word, 'es') && strlen($word) > 3) {
            $withoutEs = substr($word, 0, -2);
            // Only remove if last char is a consonant
            if (!in_array(substr($withoutEs, -1), ['a','e','i','o','u'])) {
                return $withoutEs;
            }
        }

        // Regular 's' ending → remove 's'
        if (str_ends_with($word, 's') && strlen($word) > 2) {
            return substr($word, 0, -1);
        }

        return $word;
    }

    /**
     * Extract JSON from a text that may contain markdown code fences.
     */
    private function extractJson(string $text): string
    {
        $text = trim($text);

        // Strip ```json ... ``` or ``` ... ``` fences
        if (preg_match('/```(?:json)?\s*([\s\S]*?)```/i', $text, $m)) {
            return trim($m[1]);
        }

        // If it starts with { directly, return as-is
        if (str_starts_with($text, '{')) {
            return $text;
        }

        // Try to find the first { and last } and extract that block
        $start = strpos($text, '{');
        $end   = strrpos($text, '}');
        if ($start !== false && $end !== false && $end > $start) {
            return substr($text, $start, $end - $start + 1);
        }

        return $text;
    }
}
