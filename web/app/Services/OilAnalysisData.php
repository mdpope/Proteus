<?php

namespace App\Services;

use Illuminate\Validation\Rule;

class OilAnalysisData
{
    public const FIELDS = ['analysis_status', 'lab', 'report_number', 'unit_id', 'engine', 'oil_type', 'sample_date', 'report_date', 'oil_miles', 'makeup_quarts', 'comparison_miles', 'lab_comments', 'collection_notes', 'order_number', 'measurements'];

    public static function rules(): array
    {
        $rules = [
            'data.analysis_status' => ['nullable', Rule::in(['awaiting_mailing', 'submitted', 'reported'])],
            'data.sample_date' => 'nullable|date_format:Y-m-d|before_or_equal:today',
            'data.report_date' => 'nullable|date_format:Y-m-d|before_or_equal:today',
            'data.oil_miles' => 'nullable|numeric|min:0|max:10000000',
            'data.makeup_quarts' => 'nullable|numeric|min:0|max:1000',
            'data.comparison_miles' => 'nullable|numeric|min:0|max:10000000',
            'data.lab_comments' => 'nullable|string|max:20000',
            'data.collection_notes' => 'nullable|string|max:20000',
            'data.measurements' => 'nullable|array|max:100',
            'data.measurements.*' => 'array:name,value,unit,reference,unit_average,universal_average',
            'data.measurements.*.name' => 'required|string|max:100',
            'data.measurements.*.value' => 'nullable|string|max:100',
        ];
        foreach (['lab', 'report_number', 'unit_id', 'engine', 'oil_type', 'order_number'] as $key) {
            $rules['data.'.$key] = 'nullable|string|max:200';
        }
        foreach (['unit', 'reference', 'unit_average', 'universal_average'] as $key) {
            $rules['data.measurements.*.'.$key] = 'nullable|string|max:100';
        }

        return $rules;
    }

    public static function issues(array $data): array
    {
        $issues = [];
        if (($data['analysis_status'] ?? '') === 'reported') {
            foreach (['report_number', 'report_date'] as $key) {
                if (empty($data[$key])) {
                    $issues[] = 'Check '.str_replace('_', ' ', $key).'.';
                }
            }
        } elseif (! empty($data['report_date']) || ! empty($data['measurements']) || ! empty($data['lab_comments'])) {
            $issues[] = 'Lab results require reported status.';
        }
        if (! empty($data['sample_date']) && ! empty($data['report_date']) && $data['report_date'] < $data['sample_date']) {
            $issues[] = 'Report date precedes the sample date.';
        }
        if (isset($data['oil_miles'], $data['odometer']) && $data['oil_miles'] > $data['odometer']) {
            $issues[] = 'Miles on oil exceed the vehicle odometer.';
        }

        return $issues;
    }
}
