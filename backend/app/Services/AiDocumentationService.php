<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiDocumentationService
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
     * Generate the README.md content.
     */
    public function generateReadme(array $models, string $projectName): string
    {
        $prompt = $this->buildReadmePrompt($models, $projectName);
        return $this->callApi($prompt, "# {$projectName}\n\nProyecto generado automáticamente.");
    }

    /**
     * Generate the DATABASE.md content.
     */
    public function generateTechnicalDocs(array $models): string
    {
        $prompt = $this->buildDatabasePrompt($models);
        return $this->callApi($prompt, "# Documentación de Base de Datos\n\nNo se pudo generar la documentación detallada.");
    }

    private function callApi(string $prompt, string $fallback, int $attempts = 3): string
    {
        for ($i = 0; $i < $attempts; $i++) {
            try {
                if ($i > 0) {
                    sleep($i * 2); // Espera progresiva para evitar límites de rate limit
                }
                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$this->apiKey}",
                    'HTTP-Referer'  => config('app.url'),
                    'X-Title'       => 'Laravel Builder',
                ])->timeout(120)->post($this->baseUrl, [

                    'model' => $this->model,
                    'messages' => [
                        [
                            'role'    => 'user',
                            'content' => $prompt,
                        ],
                    ],
                    'temperature' => 0.3,
                    'max_tokens'  => 8192,
                ]);

                if (!$response->successful()) {
                    Log::warning('OpenRouter API error (Docs)', [
                        'status' => $response->status(),
                        'body'   => $response->body(),
                        'attempt' => $i + 1
                    ]);
                    continue;
                }

                $body = $response->json();
                $text = $body['choices'][0]['message']['content'] ?? null;

                if (!$text || $this->isSafetyWarning($text)) {
                    Log::warning('OpenRouter returned invalid/safety text', [
                        'text' => $text,
                        'attempt' => $i + 1
                    ]);
                    continue;
                }

                return trim($text);

            } catch (\Exception $e) {
                Log::error('OpenRouter docs generation failed', [
                    'error' => $e->getMessage(),
                    'attempt' => $i + 1
                ]);
            }
        }

        return $fallback;
    }

    private function isSafetyWarning(string $text): bool
    {
        $textLower = strtolower(trim($text));

        // Check for common safety messages
        if (str_contains($textLower, 'user safety:') || str_contains($textLower, 'safety policy') || str_contains($textLower, 'safety guidelines')) {
            return true;
        }

        // If it's less than 50 characters, it is not a valid documentation file
        if (strlen(trim($text)) < 50) {
            return true;
        }

        return false;
    }


    private function buildReadmePrompt(array $models, string $projectName): string
    {
        $modelsSummary = [];
        foreach ($models as $model) {
            $desc = $model['model_description'] ?? 'Modelo de dominio';
            $modelsSummary[] = "- **{$model['model_name']}**: {$desc}";
        }
        $modelsJson = implode("\n", $modelsSummary);

        return <<<PROMPT
You are an expert technical writer and Laravel developer.
Generate a comprehensive, professional README.md for a new Laravel API project named "{$projectName}".
**IMPORTANT: You MUST write the entire README in SPANISH.**

Here is the list of primary models/entities in this project and their purpose:
{$modelsJson}

The README should include:
1. Project Title and a brief, compelling description inferred from the entities.
2. Requirements (PHP, Composer, MySQL, etc).
3. Installation Instructions (Unzip the downloaded project, run composer install, setup .env, run migrations, php artisan serve). Do NOT mention cloning a repository.
4. Features (inferred from the models).
5. Basic API Endpoints structure (e.g. standard resourceful routes /api/...).

Format as pure Markdown. Do NOT wrap the entire response in ```markdown fences. Just return the markdown content directly.
IMPORTANT RULE: DO NOT include any specific author names (like "Rodri" or similar) in the README.
PROMPT;
    }

    private function buildDatabasePrompt(array $models): string
    {
        $schema = json_encode(array_map(function($m) {
            return [
                'table' => $m['table_name'],
                'columns' => array_map(fn($c) => $c['name'] . ' (' . $c['type'] . ')', $m['attributes']),
                'relations' => array_map(fn($r) => $r['type'] . ' ' . $r['related_model'], $m['relations'])
            ];
        }, $models), JSON_PRETTY_PRINT);

        return <<<PROMPT
You are an expert database architect.
Generate a DATABASE.md documentation file for this schema.
**IMPORTANT: You MUST write the entire document in SPANISH.**

Schema JSON:
{$schema}

The document should include:
1. An introduction to the data model.
2. A Mermaid.js Entity-Relationship (ER) diagram based on the tables and relations.
3. A Data Dictionary section describing each table briefly.

Format as pure Markdown. Do NOT wrap the entire response in ```markdown fences. Just return the markdown content directly.
Use valid mermaid syntax for the ER diagram.
PROMPT;
    }
}
