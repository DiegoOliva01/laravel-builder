<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UploadedFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'user_id',
        'type',
        'original_name',
        'stored_path',
        'size_bytes',
        'status',
        'parse_result',
    ];

    protected $casts = [
        'parse_result' => 'array',
        'size_bytes'   => 'integer',
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
