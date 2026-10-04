<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MealEntry extends Model
{
    use HasFactory, \Illuminate\Database\Eloquent\SoftDeletes;

    protected $fillable = ['workspace_id', 'user_id', 'food_version_id', 'date', 'meal', 'qty', 'unit', 'note', 'migration_baseline', 'legacy_id', 'idempotency_key', 'request_hash'];

    protected function casts(): array
    {
        return ['date' => 'date', 'migration_baseline' => 'boolean'];
    }

    public function version(): BelongsTo
    {
        return $this->belongsTo(FoodVersion::class, 'food_version_id');
    }
}
