<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = ['workspace_id', 'name', 'kind', 'fuel_type', 'year', 'vin', 'notes', 'source_key'];

    protected function casts(): array
    {
        return [];
    }

    public function oilAnalyses(): HasMany
    {
        return $this->hasMany(Capture::class)->where('kind', 'oil_analysis');
    }

    public function services(): HasMany
    {
        return $this->hasMany(ServiceRecord::class);
    }

    public function fills(): HasMany
    {
        return $this->hasMany(FuelFill::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(MaintenanceTask::class);
    }
}
