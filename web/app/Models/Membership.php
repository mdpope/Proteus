<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Membership extends Model
{
    use HasFactory;

    protected $fillable = ['workspace_id', 'user_id', 'role', 'permissions'];

    protected function casts(): array
    {
        return ['permissions' => 'array'];
    }
}
