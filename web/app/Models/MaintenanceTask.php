<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaintenanceTask extends Model
{
    use HasFactory;

    protected $fillable = ['workspace_id', 'vehicle_id', 'title', 'notes', 'due_on', 'due_odometer', 'status', 'source_key'];

    protected function casts(): array
    {
        return ['due_on' => 'date'];
    }
}
