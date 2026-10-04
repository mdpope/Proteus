<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceRecord extends Model
{
    use HasFactory;

    protected $fillable = ['workspace_id', 'vehicle_id', 'capture_id', 'created_by', 'kind', 'title', 'occurred_on', 'date_precision', 'odometer', 'odometer_approximate', 'cost', 'vendor', 'parts', 'notes', 'source_key'];

    protected function casts(): array
    {
        return ['parts' => 'array', 'odometer_approximate' => 'boolean', 'occurred_on' => 'date'];
    }
}
