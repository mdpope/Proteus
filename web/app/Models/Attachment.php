<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attachment extends Model
{
    use HasFactory;

    protected $fillable = ['workspace_id', 'capture_id', 'original_name', 'path', 'mime_type', 'bytes', 'sha256'];

    protected function casts(): array
    {
        return [];
    }
}
