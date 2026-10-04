<?php

namespace App\Services;

use App\Models\OdometerReading;
use App\Models\Vehicle;
use Carbon\CarbonImmutable;

class FuelReport
{
    /** Full-to-full segments include every intermediate partial fill. A missing fill invalidates the interval. */
    public function calculate(iterable $fills): array
    {
        $baseline = null;
        $gallons = 0.0;
        $distance = 0.0;
        $validGallons = 0.0;
        $intervals = [];
        $previous = null;
        foreach ($fills as $fill) {
            $f = is_array($fill) ? $fill : $fill->toArray();
            $odo = (float) $f['odometer'];
            $amount = (float) $f['gallons'];
            if ($f['missed_fill'] || ($previous !== null && $odo <= $previous)) {
                $baseline = null;
                $gallons = 0.0;
            }
            if ($baseline !== null) {
                $gallons += $amount;
            }
            if ($f['full_tank']) {
                if ($baseline !== null && $gallons > 0 && $odo > $baseline['odometer']) {
                    $miles = $odo - $baseline['odometer'];
                    $distance += $miles;
                    $validGallons += $gallons;
                    $intervals[] = ['from' => $baseline['filled_at'], 'to' => $f['filled_at'], 'miles' => round($miles, 1), 'gallons' => round($gallons, 3), 'mpg' => round($miles / $gallons, 2), 'ending_fill_id' => $f['id'] ?? null];
                }
                $baseline = ['odometer' => $odo, 'filled_at' => $f['filled_at']];
                $gallons = 0.0;
            }
            $previous = $odo;
        }

        return ['mpg' => $validGallons > 0 ? round($distance / $validGallons, 2) : null, 'miles' => round($distance, 1), 'gallons' => round($validGallons, 3), 'intervals' => $intervals, 'pending_gallons' => round($gallons, 3)];
    }

    public function forVehicle(Vehicle $vehicle): array
    {
        $fills = $vehicle->fills()->where('workspace_id', $vehicle->workspace_id)->orderBy('filled_at')->orderBy('id')->get();
        $report = $this->calculate($fills);
        $observations = $fills->map(fn ($f) => ['date' => $f->filled_at->toDateString(), 'miles' => (float) $f->odometer])->all();
        foreach (OdometerReading::where('workspace_id', $vehicle->workspace_id)->where('vehicle_id', $vehicle->id)->get() as $r) {
            $observations[] = ['date' => $r->observed_on->toDateString(), 'miles' => (float) $r->miles];
        }
        foreach ($vehicle->services()->where('workspace_id', $vehicle->workspace_id)->whereNotNull('odometer')->where('date_precision', 'day')->where('odometer_approximate', false)->get() as $r) {
            $observations[] = ['date' => $r->occurred_on->toDateString(), 'miles' => (float) $r->odometer];
        }
        usort($observations, fn ($a, $b) => strcmp($a['date'], $b['date']) ?: ($a['miles'] <=> $b['miles']));
        $monthly = [];
        $previous = null;
        foreach ($observations as $o) {
            if ($previous && $o['date'] > $previous['date'] && $o['miles'] >= $previous['miles']) {
                $start = CarbonImmutable::parse($previous['date']);
                $end = CarbonImmutable::parse($o['date']);
                $days = $start->diffInDays($end);
                $rate = ($o['miles'] - $previous['miles']) / $days;
                while ($start < $end) {
                    $next = $start->startOfMonth()->addMonth()->min($end);
                    $key = $start->format('Y-m');
                    $monthly[$key] = ($monthly[$key] ?? 0) + $rate * $start->diffInDays($next);
                    $start = $next;
                }
            }
            $previous = $o;
        }
        $yearly = [];
        foreach ($monthly as $key => $miles) {
            $year = substr($key, 0, 4);
            $yearly[$year] = ($yearly[$year] ?? 0) + $miles;
        }

        return $report + ['fills' => $fills, 'latest_observation' => $previous, 'monthly_estimates' => array_map(fn ($v) => round($v, 1), $monthly), 'yearly_estimates' => array_map(fn ($v) => round($v, 1), $yearly)];
    }
}
