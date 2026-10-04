<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OdometerReading extends Model
{
    use HasFactory;

    protected $fillable = ['workspace_id', 'vehicle_id', 'capture_id', 'created_by', 'observed_on', 'miles', 'notes'];

    protected function casts(): array
    {
        return ['observed_on' => 'date'];
    }
}
