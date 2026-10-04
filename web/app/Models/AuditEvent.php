<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditEvent extends Model
{
    use HasFactory;

    protected $fillable = ['workspace_id', 'user_id', 'action', 'entity_type', 'entity_id', 'details'];

    protected function casts(): array
    {
        return ['details' => 'array'];
    }
}
