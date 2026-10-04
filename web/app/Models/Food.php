<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Food extends Model
{
    use HasFactory;

    protected $table = 'foods';

    protected $fillable = ['workspace_id', 'user_id', 'name', 'serving', 'current_version_id', 'legacy_id'];

    protected function casts(): array
    {
        return [];
    }

    public function currentVersion(): BelongsTo
    {
        return $this->belongsTo(FoodVersion::class, 'current_version_id');
    }
}
