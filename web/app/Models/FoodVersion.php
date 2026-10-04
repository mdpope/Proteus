<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FoodVersion extends Model
{
    use HasFactory;

    protected $fillable = ['food_id', 'calories', 'protein', 'fat', 'carbs', 'source_type', 'source_note', 'is_estimate', 'legacy_id'];

    protected function casts(): array
    {
        return ['is_estimate' => 'boolean'];
    }

    public function food(): BelongsTo
    {
        return $this->belongsTo(Food::class);
    }
}
