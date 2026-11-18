<?php

namespace App\Console\Commands;

use App\Services\LifeReminders;
use App\Services\PushDelivery;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class DeliverAppPush extends Command
{
    protected $signature = 'proteus:deliver-push {--limit=100}';

    protected $description = 'Deliver bounded, generic notification wakeups from the account outbox';

    public function handle(PushDelivery $push, LifeReminders $reminders): int
    {
        $lock = Cache::lock('proteus-push-delivery', 1200);
        if (! $lock->get()) {
            return self::SUCCESS;
        }
        try {
            $limit = max(1, min(100, (int) $this->option('limit')));
            $reminders->enqueueDue($limit);
            $push->deliverPending(limit: $limit);
        } finally {
            $lock->release();
        }

        return self::SUCCESS;
    }
}
