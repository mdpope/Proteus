<?php

namespace Tests\Unit;

use App\Services\FuelReport;
use PHPUnit\Framework\TestCase;

class FuelReportTest extends TestCase
{
    private function fill(float $odo, float $gallons, bool $full = true, bool $missed = false): array
    {
        return ['odometer' => $odo, 'gallons' => $gallons, 'full_tank' => $full, 'missed_fill' => $missed, 'filled_at' => '2026-09-01'];
    }

    public function test_partial_fills_are_summed_and_average_is_weighted(): void
    {
        $result = (new FuelReport)->calculate([$this->fill(1000, 10), $this->fill(1100, 4, false), $this->fill(1300, 11), $this->fill(1800, 20)]);
        $this->assertSame(20.0, $result['intervals'][0]['mpg']);
        $this->assertSame(22.86, $result['mpg']);
        $this->assertSame(800.0, $result['miles']);
    }

    public function test_no_mpg_is_invented_from_first_or_partial_fill(): void
    {
        $result = (new FuelReport)->calculate([$this->fill(1000, 10, false), $this->fill(1100, 10), $this->fill(1200, 5, false)]);
        $this->assertNull($result['mpg']);
        $this->assertSame(5.0, $result['pending_gallons']);
    }

    public function test_missing_fill_and_odometer_rollback_break_the_interval(): void
    {
        $result = (new FuelReport)->calculate([$this->fill(1000, 10), $this->fill(1500, 12, true, true), $this->fill(1800, 15), $this->fill(900, 12)]);
        $this->assertSame(20.0, $result['mpg']);
        $this->assertCount(1, $result['intervals']);
    }
}
