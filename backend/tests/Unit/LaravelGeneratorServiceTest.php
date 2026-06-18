<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\LaravelGeneratorService;

class LaravelGeneratorServiceTest extends TestCase
{
    public function test_it_generates_model_correctly(): void
    {
        // Mock data
        $modelData = [
            'model_name' => 'User',
            'table_name' => 'users',
            'model_description' => 'Modelo de usuarios para la aplicacion.',
            'attributes' => [
                ['name' => 'id', 'type' => 'bigint unsigned', 'primary' => true, 'fillable' => false, 'nullable' => false],
                ['name' => 'name', 'type' => 'varchar(255)', 'primary' => false, 'fillable' => true, 'nullable' => false],
                ['name' => 'email', 'type' => 'varchar(255)', 'primary' => false, 'fillable' => true, 'nullable' => false],
            ],
            'relations' => [
                [
                    'type' => 'hasMany',
                    'related_model' => 'Post',
                    'foreign_key' => 'user_id',
                    'local_key' => 'id'
                ]
            ]
        ];

        $service = new LaravelGeneratorService();
        $content = $service->generateModel($modelData);

        // Assertions
        $this->assertStringContainsString('class User extends Model', $content);
        $this->assertStringContainsString('Modelo de usuarios para la aplicacion.', $content);
        $this->assertStringContainsString("protected \$fillable = [\n        'name',\n        'email'\n    ];", $content);
        $this->assertStringContainsString('public function posts()', $content);
        $this->assertStringContainsString("return \$this->hasMany(Post::class, 'user_id', 'id');", $content);
    }
}
