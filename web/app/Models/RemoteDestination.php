<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RemoteDestination extends Model
{
    protected $fillable = ['host_id', 'relay', 'label', 'device_id', 'credential', 'paired_at'];

    protected $hidden = ['credential'];

    protected function casts(): array
    {
        return ['credential' => 'encrypted', 'paired_at' => 'immutable_datetime'];
    }

    public function metadata(): array
    {
        return [
            'hostId' => $this->host_id,
            'relay' => $this->relay,
            'label' => $this->label,
            'deviceId' => $this->device_id,
            'pairedAt' => $this->paired_at->toISOString(),
        ];
    }
}
