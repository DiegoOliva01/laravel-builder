<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class LaravelGeneratorService
{
    private string $stubsPath;

    public function __construct()
    {
        $this->stubsPath = base_path('resources/stubs');
    }

    /**
     * Generate the Eloquent Model class content.
     */
    public function generateModel(array $modelData): string
    {
        $stub = File::get("{$this->stubsPath}/model.stub");

        // Table name if not conventional
        $tableName = $modelData['table_name'];
        $expectedTable = Str::snake(Str::pluralStudly($modelData['model_name']));
        $tableStr = $tableName !== $expectedTable ? "    protected \$table = '{$tableName}';\n" : "";

        // Fillable properties
        $fillables = array_filter($modelData['attributes'], fn($col) => $col['fillable']);
        $fillableNames = array_map(fn($col) => "'" . $col['name'] . "'", $fillables);
        $fillableStr = count($fillableNames) > 0
            ? "    protected \$fillable = [\n        " . implode(",\n        ", $fillableNames) . "\n    ];\n"
            : "";

        // Relations
        $relationsStr = "";
        foreach ($modelData['relations'] as $rel) {
            $methodName = $this->getRelationMethodName($rel);
            $relationsStr .= "\n    public function {$methodName}()\n    {\n";
            
            if ($rel['type'] === 'belongsToMany') {
                $relationsStr .= "        return \$this->{$rel['type']}({$rel['related_model']}::class, '{$rel['pivot_table']}', '{$rel['foreign_pivot_key']}', '{$rel['related_pivot_key']}');\n";
            } else {
                $relationsStr .= "        return \$this->{$rel['type']}({$rel['related_model']}::class, '{$rel['foreign_key']}', '{$rel['local_key']}');\n";
            }
            $relationsStr .= "    }\n";
        }

        $content = str_replace(
            ['{{ class }}', '{{ table }}', '{{ fillable }}', '{{ relations }}', '{{ phpdoc }}'],
            [$modelData['model_name'], $tableStr, $fillableStr, $relationsStr, $modelData['model_description'] ?? ''],
            $stub
        );

        return $content;
    }

    /**
     * Generate the Migration file content.
     */
    public function generateMigration(array $modelData): string
    {
        $stub = File::get("{$this->stubsPath}/migration.stub");

        $columnsStr = "";
        foreach ($modelData['attributes'] as $col) {
            $colLine = "            \$table";
            
            if ($col['primary'] && str_contains($col['type'], 'int')) {
                $colLine .= "->id('{$col['name']}');";
            } elseif ($col['name'] === 'created_at' || $col['name'] === 'updated_at') {
                continue; // We'll add $table->timestamps() at the end
            } else {
                $laravelType = $this->mapSqlTypeToLaravel($col['type']);
                $colLine .= "->{$laravelType}('{$col['name']}')";
                if ($col['nullable']) {
                    $colLine .= "->nullable()";
                }
                $colLine .= ";";
            }
            $columnsStr .= $colLine . "\n";
        }

        // Check if we need timestamps
        $hasTimestamps = count(array_filter($modelData['attributes'], fn($c) => in_array($c['name'], ['created_at', 'updated_at']))) > 0;
        if ($hasTimestamps) {
            $columnsStr .= "            \$table->timestamps();\n";
        }

        // Add database-level foreign key constraints
        $foreignKeysStr = "";
        if (!empty($modelData['relations'])) {
            foreach ($modelData['relations'] as $rel) {
                if ($rel['type'] === 'belongsTo' && isset($rel['related_table'])) {
                    $foreignKeysStr .= "            \$table->foreign('{$rel['foreign_key']}')->references('{$rel['local_key']}')->on('{$rel['related_table']}')->onDelete('cascade');\n";
                }
            }
        }
        if ($foreignKeysStr) {
            $columnsStr .= "\n" . $foreignKeysStr;
        }

        $content = str_replace(
            ['{{ table }}', '{{ columns }}'],
            [$modelData['table_name'], rtrim($columnsStr)],
            $stub
        );

        return $content;
    }

    /**
     * Generate the Factory file content.
     */
    public function generateFactory(array $modelData): string
    {
        $stub = File::get("{$this->stubsPath}/factory.stub");

        $defStr = "";
        $fillables = array_filter($modelData['attributes'], fn($col) => $col['fillable']);
        
        foreach ($fillables as $col) {
            $faker = $this->mapColumnToFaker($col['name'], $col['type']);
            $defStr .= "            '{$col['name']}' => {$faker},\n";
        }

        $content = str_replace(
            ['{{ class }}', '{{ definition }}'],
            [$modelData['model_name'], rtrim($defStr)],
            $stub
        );

        return $content;
    }

    /**
     * Generate the Seeder file content.
     */
    public function generateSeeder(array $modelData): string
    {
        $stub = File::get("{$this->stubsPath}/seeder.stub");

        $content = str_replace('{{ class }}', $modelData['model_name'], $stub);

        return $content;
    }

    /**
     * Generate the API Controller file content.
     */
    public function generateController(array $modelData): string
    {
        $stub = File::get("{$this->stubsPath}/controller.stub");
        $content = str_replace(
            ['{{ class }}', '{{ variable }}', '{{ phpdoc }}'],
            [$modelData['model_name'], Str::snake($modelData['model_name']), $modelData['model_description'] ?? ''],
            $stub
        );
        return $content;
    }

    /**
     * Generate the FormRequest file content (Store or Update).
     */
    public function generateRequest(array $modelData, string $type): string
    {
        $stub = File::get("{$this->stubsPath}/request.stub");
        
        $rulesStr = "";
        $fillables = array_filter($modelData['attributes'], fn($col) => $col['fillable']);
        foreach ($fillables as $col) {
            $rules = [];
            if ($type === 'Store') {
                $rules[] = $col['nullable'] ? 'nullable' : 'required';
            } else {
                $rules[] = 'sometimes';
                if (!$col['nullable']) $rules[] = 'required';
            }
            
            $laravelType = $this->mapSqlTypeToLaravel($col['type']);
            if (in_array($laravelType, ['integer', 'bigInteger', 'foreignId'])) $rules[] = 'integer';
            elseif ($laravelType === 'boolean') $rules[] = 'boolean';
            else $rules[] = 'string';
            
            // Basic lengths
            if (str_contains(strtolower($col['type']), 'varchar(255)')) {
                $rules[] = 'max:255';
            }

            $rulesList = "'" . implode("', '", $rules) . "'";
            $rulesStr .= "            '{$col['name']}' => [{$rulesList}],\n";
        }

        $content = str_replace(
            ['{{ class }}', '{{ type }}', '{{ rules }}'],
            [$modelData['model_name'], $type, rtrim($rulesStr)],
            $stub
        );

        return $content;
    }

    /**
     * Generate the API Resource file content.
     */
    public function generateApiResource(array $modelData): string
    {
        $stub = File::get("{$this->stubsPath}/resource.stub");

        $fieldsStr = "";
        foreach ($modelData['attributes'] as $col) {
            $fieldsStr .= "            '{$col['name']}' => \$this->{$col['name']},\n";
        }

        $content = str_replace(
            ['{{ class }}', '{{ fields }}'],
            [$modelData['model_name'], rtrim($fieldsStr)],
            $stub
        );

        return $content;
    }

    /**
     * Generate the api.php routes file content for all models.
     */
    public function generateApiRoutes(array $models): string
    {
        $stub = File::get("{$this->stubsPath}/api_routes.stub");

        $useStatements = "";
        $routesStr = "";

        foreach ($models as $modelData) {
            $useStatements .= "use App\Http\Controllers\Api\\{$modelData['model_name']}Controller;\n";
            $routeName = Str::kebab(Str::plural($modelData['model_name']));
            $routesStr .= "    Route::apiResource('{$routeName}', {$modelData['model_name']}Controller::class);\n";
        }

        $content = str_replace(
            ['{{ use_statements }}', '{{ routes }}'],
            [trim($useStatements), rtrim($routesStr)],
            $stub
        );

        return $content;
    }

    // --- Helpers ---

    private function getRelationMethodName(array $rel): string
    {
        $base = Str::camel($rel['related_model']);
        if (in_array($rel['type'], ['hasMany', 'belongsToMany'])) {
            return Str::plural($base);
        }
        return $base;
    }

    private function mapSqlTypeToLaravel(string $sqlType): string
    {
        $sqlType = strtolower($sqlType);
        if (str_contains($sqlType, 'varchar') || str_contains($sqlType, 'char')) return 'string';
        if (str_contains($sqlType, 'text')) return 'text';
        if (str_contains($sqlType, 'bigint')) return 'bigInteger';
        if (str_contains($sqlType, 'int')) return 'integer';
        if (str_contains($sqlType, 'datetime')) return 'dateTime';
        if (str_contains($sqlType, 'timestamp')) return 'timestamp';
        if (str_contains($sqlType, 'date')) return 'date';
        if (str_contains($sqlType, 'boolean') || str_contains($sqlType, 'tinyint(1)')) return 'boolean';
        if (str_contains($sqlType, 'decimal')) return 'decimal';
        return 'string';
    }

    private function mapColumnToFaker(string $name, string $type): string
    {
        $name = strtolower($name);
        if (str_contains($name, 'email')) return 'fake()->unique()->safeEmail()';
        if (str_contains($name, 'password')) return "bcrypt('password')";
        if (str_contains($name, 'name')) return 'fake()->name()';
        if (str_contains($name, 'phone')) return 'fake()->phoneNumber()';
        if (str_contains($name, 'address')) return 'fake()->address()';
        if (str_contains($type, 'int')) return 'fake()->randomNumber()';
        if (str_contains($type, 'text')) return 'fake()->paragraph()';
        return 'fake()->word()';
    }
}
