<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\AppRecords;
use App\Services\PushDelivery;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DeliverAppPush extends Command
{
    protected $signature = 'proteus:deliver-push {--limit=100}';

    protected $description = 'Deliver bounded, generic notification wakeups from the account outbox';

    public function handle(AppRecords $records, PushDelivery $push): int
    {
        $lock = Cache::lock('proteus-push-delivery', 1200);
        if (! $lock->get()) {
            return self::SUCCESS;
        }
        try {
            $rows = DB::table('app_records')->where('kind', 'push-outbox')->orderBy('updated_at')->limit(max(1, min(100, (int) $this->option('limit'))))->get();
            foreach ($rows as $row) {
                $user = User::find($row->user_id);
                if (! $user) {
                    continue;
                }
                $item = $records->decode($row);
                $subscription = $records->query($user, 'push-subscriptions')->where('id', $item['subscriptionId'])->first();
                $result = $subscription ? $push->deliver($records->decode($subscription)) : 'expired';
                if ($result === 'unavailable') {
                    continue;
                }
                if (in_array($result, ['accepted', 'expired']) || $item['attempts'] >= 4) {
                    $records->query($user, 'push-outbox')->where('id', $row->id)->delete();
                    if ($result === 'expired' && $subscription) {
                        $records->query($user, 'push-subscriptions')->where('id', $subscription->id)->delete();
                    }
                } else {
                    $records->save($user, 'push-outbox', ['subscriptionId' => $item['subscriptionId'], 'notificationId' => $item['notificationId'], 'attempts' => $item['attempts'] + 1, 'state' => $result], $row->id);
                }
                if ($result === 'failed') {
                    $records->save($user, 'logs', ['code' => 'push_failed', 'event' => 'push_failed', 'level' => 'warning', 'source' => 'server', 'message' => 'Push provider did not accept a notification.']);
                }
            }
        } finally {
            $lock->release();
        }

        return self::SUCCESS;
    }
}
