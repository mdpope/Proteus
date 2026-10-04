<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FuelFill extends Model
{
    use HasFactory;

    protected $fillable = ['workspace_id', 'vehicle_id', 'capture_id', 'created_by', 'filled_at', 'odometer', 'gallons', 'price_per_gallon', 'total_cost', 'fuel_type', 'full_tank', 'missed_fill', 'trip_miles', 'dashboard_mpg', 'station', 'notes'];

    protected function casts(): array
    {
        return ['full_tank' => 'boolean', 'missed_fill' => 'boolean', 'filled_at' => 'datetime'];
    }
}
