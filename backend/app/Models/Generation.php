<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Generation extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'user_id',
        'status',
        'download_url',
        'error_message',
        'project_name',
        'laravel_version',
        'installation_type',
        'schema_snapshot',
    ];

    protected $casts = [
        'schema_snapshot' => 'array',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
