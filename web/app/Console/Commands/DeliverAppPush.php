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
            $limit = max(1, min(100, (int) $this->option('limit')));
            $processed = 0;
            $rows = DB::table('app_records')->where('kind', 'push-outbox')->orderBy('updated_at')->limit(AppRecords::LIMITS['push-outbox'])->get();
            foreach ($rows as $row) {
                $user = User::find($row->user_id);
                if (! $user) {
                    continue;
                }
                $item = $records->decode($row);
                $subscription = $records->query($user, 'push-subscriptions')->where('id', $item['subscriptionId'])->first();
                $notification = $records->query($user, 'notifications')->where('id', $item['notificationId'])->first();
                if (! $notification || ! $subscription || PushDelivery::obsolete($records->decode($notification))) {
                    $records->query($user, 'push-outbox')->where('id', $row->id)->delete();

                    continue;
                }
                // Persist before external delivery. A crash/timeout may follow
                // acceptance, so retry only a known rejection, never ambiguity.
                if (in_array($item['state'] ?? '', ['sending', 'uncertain', 'failed'])) {
                    // Keep bounded unresolved receipts, but let newer work reach
                    // the next bounded scan. Expired receipts are retired above.
                    DB::table('app_records')->where('id', $row->id)->update(['updated_at' => now()->utc()->format('Y-m-d H:i:s')]);

                    continue;
                }
                if ($processed++ >= $limit) {
                    break;
                }
                $intent = ['subscriptionId' => $item['subscriptionId'], 'notificationId' => $item['notificationId'], 'attempts' => $item['attempts'], 'state' => 'sending'];
                $records->save($user, 'push-outbox', $intent, $row->id);
                $result = ! $notification ? 'obsolete' : ($subscription ? $push->deliver($records->decode($subscription), $records->decode($notification)) : 'expired');
                if ($result === 'unavailable') {
                    $records->save($user, 'push-outbox', array_replace($intent, ['state' => 'pending']), $row->id);

                    continue;
                }
                if (in_array($result, ['accepted', 'expired', 'obsolete']) || $item['attempts'] >= 4) {
                    $records->query($user, 'push-outbox')->where('id', $row->id)->delete();
                    if ($result === 'expired' && $subscription) {
                        $records->query($user, 'push-subscriptions')->where('id', $subscription->id)->delete();
                    }
                } else {
                    $records->save($user, 'push-outbox', ['subscriptionId' => $item['subscriptionId'], 'notificationId' => $item['notificationId'], 'attempts' => $item['attempts'] + 1, 'state' => $result === 'failed' ? 'rejected' : $result], $row->id);
                }
                if (in_array($result, ['failed', 'uncertain'])) {
                    $records->save($user, 'logs', ['code' => 'push_failed', 'event' => 'push_failed', 'level' => 'warning', 'source' => 'server', 'message' => $result === 'uncertain' ? 'Push delivery is uncertain; automatic redelivery is held to avoid duplicate alerts.' : 'Push provider rejected a notification.']);
                }
            }
        } finally {
            $lock->release();
        }

        return self::SUCCESS;
    }
}
