<?php

namespace App\Services;

use App\Models\{Food, Membership, User, Vehicle, Workspace};
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Native JSON projection of the same tenant-scoped records used by the website. */
class LifeReadModel
{
    public function __construct(private TenantAccess $access, private NutritionReport $nutrition, private FuelReport $fuel) {}

    public function profile(User $user): array
    {
        $m = Membership::where('workspace_id', $user->current_workspace_id)->where('user_id', $user->id)->firstOrFail();
        $abilities = [];
        foreach (['garage.read', 'garage.add', 'garage.edit', 'nutrition.read', 'nutrition.add', 'nutrition.edit'] as $ability) {
            try { $this->access->workspace($user, $ability); $abilities[] = $ability; } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) { if ($e->getStatusCode() !== 403) throw $e; }
        }
        return ['accountId' => hash_hmac('sha256', 'proteus-life:'.$user->id, config('app.key')), 'workspaceId' => (string) $m->workspace_id,
            'displayName' => $user->name, 'capabilities' => $abilities, 'readOnly' => ! $user->tokenCan('brain:write') || ! Schema::hasTable('proteus_life_mutations'),
            'sections' => array_values(array_filter(['overview', 'nutrition', 'garage', 'fuel', 'captures', 'security', 'connections'], fn ($s) => in_array($s === 'nutrition' ? 'nutrition.read' : 'garage.read', $abilities))),
            'evidence' => ['available' => true, 'mode' => 'website'], 'canRevokeTokens' => false];
    }

    public static function clean($row): array
    {
        $r = is_array($row) ? $row : (method_exists($row, 'toArray') ? $row->toArray() : (array) $row);
        foreach (['workspace_id', 'user_id', 'created_by', 'idempotency_key', 'request_hash', 'path', 'source_key', 'legacy_id'] as $k) unset($r[$k]);
        foreach (['payload', 'details', 'parts', 'uncertainties', 'scopes'] as $k) if (isset($r[$k]) && is_string($r[$k])) $r[$k] = json_decode($r[$k], true) ?? [];
        foreach (['date', 'occurred_on', 'observed_on', 'due_on'] as $k) if (! empty($r[$k])) $r[$k] = substr($r[$k], 0, 10);
        return $r;
    }

    private function rows(string $table, int $workspace, ?int $user = null) {
        $q = DB::table($table)->where('workspace_id', $workspace);
        return $user === null ? $q : $q->where('user_id', $user);
    }

    private function records($rows): array { return $rows->map(fn ($r) => self::clean($r))->values()->all(); }

    private function audit(User $user, array $profile, int $limit): array {
        return $this->records($this->rows('audit_events', $user->current_workspace_id, $user->id)->orderByDesc('id')->limit($limit)->get()->filter(function ($r) use ($profile) {
            $nutrition = preg_match('/^(nutrition\.|meal\.|food\.)/', $r->action) || preg_match('/meal|food/', $r->entity_type);
            return in_array($nutrition ? 'nutrition.read' : 'garage.read', $profile['capabilities']);
        }));
    }

    private function summary(int $w, int $u, array $days, ?string $from = null, ?string $through = null): array {
        $s = $this->nutrition->summary($w, $u, $from, $through);
        $selected = array_values(array_filter($days, fn ($d) => (! $from || $d['date'] >= $from) && (! $through || $d['date'] <= $through)));
        $calendar = $from && $through ? (int) CarbonImmutable::parse($from, 'UTC')->diffInDays(CarbonImmutable::parse($through, 'UTC')) + 1 : null;
        $r = ['from' => $from, 'through' => $through, 'completeDays' => (int) $s['complete_days'], 'entryCount' => (int) $s['entry_count'], 'firstDate' => $s['first_date'] ? substr($s['first_date'], 0, 10) : null, 'lastDate' => $s['last_date'] ? substr($s['last_date'], 0, 10) : null, 'calendarDays' => $calendar, 'loggedDays' => count($selected), 'partialDays' => count($selected) - (int) $s['complete_days'], 'unloggedDays' => $calendar === null ? null : $calendar - count($selected)];
        foreach (['calories', 'protein', 'carbs', 'fat'] as $k) $r[$k] = $s[$k] === null ? null : (float) $s[$k];
        return $r;
    }

    public function data(User $user, string $section, array $query): array
    {
        $w = $this->access->workspace($user, $section === 'nutrition' ? 'nutrition.read' : 'garage.read');
        $profile = $this->profile($user); $base = ['section' => $section] + $profile;
        $page = $query['page'] ?? 1; $size = 100;
        if ($section === 'nutrition') {
            $all = DB::table('meal_entries as m')->join('food_versions as v', 'v.id', '=', 'm.food_version_id')->join('foods as f', 'f.id', '=', 'v.food_id')
                ->where('m.workspace_id', $w)->where('m.user_id', $user->id)->where('f.workspace_id', $w)->where('f.user_id', $user->id)->whereNull('m.deleted_at')
                ->orderByDesc('m.date')->orderByDesc('m.id')->get(['m.*', 'f.id as food_id', 'f.name as food_name', 'v.calories', 'v.protein', 'v.carbs', 'v.fat']);
            $all->each(function ($e) { $e->date = substr($e->date, 0, 10); });
            $days = [];
            foreach ($all->groupBy('date') as $date => $entries) {
                $meals = $entries->map(fn ($e) => strtolower($e->meal))->unique();
                $d = ['date' => $date, 'entryCount' => $entries->count(), 'foodNames' => $entries->take(4)->pluck('food_name')->all(), 'complete' => collect(['breakfast', 'lunch', 'dinner'])->diff($meals)->isEmpty()];
                foreach (['calories', 'protein', 'carbs', 'fat'] as $k) $d[$k] = $entries->sum(fn ($e) => $e->qty * $e->$k);
                $days[] = $d;
            }
            $zone = Workspace::findOrFail($w)->timezone ?: 'UTC'; $today = CarbonImmutable::now($zone)->startOfDay();
            $periods = [];
            foreach ([['all_complete_days', 'All complete days', null, null], ['this_month', 'This month', $today->startOfMonth()->toDateString(), $today->toDateString()], ['last_30_calendar_days', 'Last 30 calendar days', $today->subDays(29)->toDateString(), $today->toDateString()]] as [$id, $label, $from, $through]) $periods[] = ['id' => $id, 'label' => $label] + $this->summary($w, $user->id, $days, $from, $through);
            $from = $query['from'] ?? null; $through = $query['through'] ?? null;
            $selected = array_values(array_filter($days, fn ($d) => (! $from || $d['date'] >= $from) && (! $through || $d['date'] <= $through)));
            $monthly = [];
            foreach (collect($selected)->where('complete', true)->groupBy(fn ($d) => substr($d['date'], 0, 7)) as $month => $group) {
                $item = ['month' => $month, 'days' => $group->count(), 'completeDays' => $group->count(), 'entryCount' => $group->sum('entryCount'), 'caloriesTotal' => $group->sum('calories')];
                foreach (['calories', 'protein', 'carbs', 'fat'] as $k) $item[$k] = $group->avg($k);
                $monthly[] = $item;
            }
            $foods = Food::where('workspace_id', $w)->where('user_id', $user->id)->with('currentVersion')->orderBy('name')->get()->filter(fn ($f) => ! ($query['search'] ?? '') || mb_stripos($f->name, $query['search']) !== false)->map(fn ($f) => self::clean($f->getAttributes()) + collect($f->currentVersion?->getAttributes() ?? [])->only(['calories', 'protein', 'carbs', 'fat', 'source_type', 'source_note', 'is_estimate'])->all())->values();
            $entries = $all->filter(fn ($e) => isset($query['date']) ? $e->date === $query['date'] : ((! $from || $e->date >= $from) && (! $through || $e->date <= $through)))->values();
            $versions = [];
            if (isset($query['foodId'])) { $f = Food::where('workspace_id', $w)->where('user_id', $user->id)->findOrFail($query['foodId']); $versions = $this->records(DB::table('food_versions')->where('food_id', $f->id)->orderByDesc('id')->get()); }
            $summary = $this->summary($w, $user->id, $days, $from, $through);
            $tab = $query['tab'] ?? 'days'; $total = match ($tab) { 'foods' => $foods->count(), 'day' => $entries->count(), 'averages' => count($monthly), default => count($selected) };
            return $base + ['tab' => $tab, 'reportDate' => $today->toDateString(), 'reportTimezone' => $zone, 'periodSummaries' => $periods, 'averages' => ['days' => $summary['completeDays']] + $summary, 'days' => array_slice($selected, ($page - 1) * $size, $size), 'monthly' => array_slice($monthly, ($page - 1) * $size, $size), 'foods' => $foods->slice(($page - 1) * $size, $size)->values()->all(), 'entries' => $this->records($entries->slice(($page - 1) * $size, $size)), 'versions' => $versions, 'page' => $page, 'pageSize' => $size, 'hasMore' => $total > $page * $size];
        }
        if (in_array($section, ['garage', 'fuel', 'captures'])) {
            $vehicles = Vehicle::where('workspace_id', $w)->orderBy('name')->get();
            $vehicle = isset($query['vehicleId']) ? $this->access->vehicle($user, $query['vehicleId']) : null;
            $common = ['vehicles' => $this->records($vehicles), 'vehicle' => $vehicle ? self::clean($vehicle) : null];
            if ($section === 'captures') {
                $q = $this->rows('captures', $w)->when($query['status'] ?? null, fn ($q, $s) => $q->where('status', $s));
                $rows = $q->orderByDesc('id')->offset(($page - 1) * $size)->limit($size + 1)->get(); $capture = null; $attachments = [];
                if (isset($query['captureId'])) { $capture = $this->access->captures($user)->findOrFail($query['captureId']); $attachments = $this->records($capture->attachments()->where('workspace_id', $w)->get()); }
                return $base + $common + ['captures' => $this->records($rows->take($size)), 'capture' => $capture ? self::clean($capture) : null, 'attachments' => $attachments, 'page' => $page, 'pageSize' => $size, 'hasMore' => $rows->count() > $size];
            }
            $cards = $vehicles->map(function ($v) use ($w) {
                $r = $this->fuel->forVehicle($v);
                $report = ['weightedMpg' => $r['mpg'], 'eligibleMiles' => $r['miles'], 'eligibleGallons' => $r['gallons'], 'pendingGallons' => $r['pending_gallons'], 'intervals' => $r['intervals'], 'latestObservation' => $r['latest_observation'], 'monthlyEstimates' => collect($r['monthly_estimates'])->map(fn ($m, $k) => ['month' => $k, 'miles' => $m])->values()->all(), 'yearlyEstimates' => collect($r['yearly_estimates'])->map(fn ($m, $k) => ['year' => (string) $k, 'miles' => $m])->values()->all(), 'estimated' => true];
                return ['vehicle' => self::clean($v), 'historyCount' => $v->services()->where('workspace_id', $w)->count(), 'openTaskCount' => $v->tasks()->where('workspace_id', $w)->where('status', 'open')->count(), 'oilAnalysisCount' => $v->oilAnalyses()->where('workspace_id', $w)->count(), 'fillCount' => count($r['fills']), 'latestObservation' => $r['latest_observation'], 'report' => $report];
            });
            $summary = $vehicle ? $cards->firstWhere('vehicle.id', $vehicle->id) : null;
            $reports = $cards->pluck('report'); $miles = $reports->sum('eligibleMiles'); $gallons = $reports->sum('eligibleGallons');
            $aggregate = ['weightedMpg' => $gallons ? $miles / $gallons : null, 'eligibleMiles' => $miles, 'eligibleGallons' => $gallons, 'pendingGallons' => $reports->sum('pendingGallons'), 'intervals' => $reports->pluck('intervals')->flatten(1)->all(), 'monthlyEstimates' => [], 'yearlyEstimates' => [], 'estimated' => true, 'latestObservation' => $reports->pluck('latestObservation')->filter()->sortByDesc('date')->first()];
            foreach (['monthlyEstimates' => 'month', 'yearlyEstimates' => 'year'] as $field => $key) $aggregate[$field] = $reports->pluck($field)->flatten(1)->groupBy($key)->map(fn ($g, $k) => [$key => (string) $k, 'miles' => $g->sum('miles')])->values()->all();
            $common += ['vehicleCards' => $cards->values()->all(), 'vehicleSummary' => $summary, 'report' => $summary['report'] ?? $aggregate];
            $selected = fn ($table) => $this->rows($table, $w)->when($vehicle, fn ($q) => $q->where('vehicle_id', $vehicle->id));
            if ($section === 'fuel') return $base + $common + ['fills' => $this->records($selected('fuel_fills')->orderBy('filled_at')->get()), 'readings' => $this->records($selected('odometer_readings')->orderBy('observed_on')->get())];
            $oil = $this->access->captures($user)->where('kind', 'oil_analysis')->when($vehicle, fn ($q) => $q->where('vehicle_id', $vehicle->id))->with(['attachments' => fn ($q) => $q->where('workspace_id', $w)])->get()->sortByDesc(fn ($c) => $c->payload['sample_date'] ?? '')->map(fn ($c) => self::clean($c->getAttributes()) + ['attachments' => $this->records($c->attachments)])->values()->all();
            return $base + $common + ['services' => $this->records($selected('service_records')->orderByDesc('occurred_on')->get()), 'tasks' => $this->records($selected('maintenance_tasks')->orderBy('status')->orderBy('due_on')->get()), 'oilAnalyses' => $oil];
        }
        if ($section === 'security') return $base + ['user' => ['name' => $user->name, 'email' => $user->email, 'twoFactorEnabled' => (bool) $user->two_factor_confirmed_at], 'members' => DB::table('memberships as m')->join('users as u', 'u.id', '=', 'm.user_id')->where('m.workspace_id', $w)->get(['u.name', 'u.email', 'm.role']), 'passkeys' => DB::table('passkeys')->where('user_id', $user->id)->get(['id', 'name', 'last_used_at', 'created_at']), 'audit' => $this->audit($user, $profile, 100)];
        if ($section === 'connections') return $base + ['canRevokeTokens' => false, 'manageUrl' => url('/security'), 'tokens' => DB::table('oauth_access_tokens')->where('user_id', $user->id)->get(['id', 'name', 'scopes', 'revoked', 'expires_at'])->map(fn ($t) => array_replace(self::clean($t), ['id' => hash('sha256', $t->id)])), 'clients' => DB::table('oauth_clients')->where('owner_id', $user->id)->where('owner_type', User::class)->get(['name', 'revoked', 'created_at']), 'profile' => ['label' => config('app.name'), 'mode' => 'website', 'readOnly' => $profile['readOnly']]];
        $today = CarbonImmutable::now(Workspace::findOrFail($w)->timezone ?: 'UTC')->toDateString();
        $nutrition = in_array('nutrition.read', $profile['capabilities']) ? $this->data($user, 'nutrition', ['date' => $today]) : null;
        return $base + ['counts' => ['vehicles' => $this->rows('vehicles', $w)->count(), 'captures' => $this->rows('captures', $w)->count(), 'review' => $this->rows('captures', $w)->where('status', 'review')->count(), 'foods' => $nutrition ? $this->rows('foods', $w, $user->id)->count() : null, 'meals' => $nutrition ? $this->rows('meal_entries', $w, $user->id)->whereNull('deleted_at')->count() : null], 'nutrition' => $nutrition ? collect($nutrition['days'])->firstWhere('date', $today) : null, 'recentAudit' => $this->audit($user, $profile, 20), 'tasks' => $this->records($this->rows('maintenance_tasks', $w)->where('status', 'open')->orderBy('due_on')->limit(30)->get())];
    }
}
