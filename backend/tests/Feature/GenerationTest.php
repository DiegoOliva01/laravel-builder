<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;
use App\Models\User;
use App\Models\Project;
use App\Models\UploadedFile;
use App\Jobs\GenerateProjectJob;

class GenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_dispatches_generation_job(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $project = Project::create([
            'user_id' => $user->id,
            'name' => 'Test Project',
            'laravel_version' => '11',
            'installation_type' => 'API',
        ]);

        UploadedFile::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'type' => 'sql',
            'original_name' => 'schema.sql',
            'stored_path' => 'dummy/path.sql',
            'size_bytes' => 1024,
            'status' => 'processed',
            'parse_result' => [
                'tables' => [
                    ['name' => 'users', 'columns' => []]
                ],
                'models' => [
                    [
                        'table_name' => 'users',
                        'model_name' => 'User',
                        'attributes' => [],
                        'relations' => []
                    ]
                ]
            ]
        ]);

        $response = $this->actingAs($user)->postJson("/api/v1/projects/{$project->id}/generations");

        $response->assertStatus(202);
        $response->assertJsonStructure(['message', 'generation' => ['id', 'status']]);

        // Assert job was dispatched
        Queue::assertPushed(GenerateProjectJob::class);
    }
}
