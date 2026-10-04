<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Capture extends Model
{
    use HasFactory;

    protected $fillable = ['workspace_id', 'created_by', 'vehicle_id', 'kind', 'source', 'status', 'title', 'notes', 'payload', 'uncertainties', 'idempotency_key', 'request_hash', 'accepted_at'];

    protected function casts(): array
    {
        return ['payload' => 'array', 'uncertainties' => 'array', 'accepted_at' => 'datetime'];
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
}
