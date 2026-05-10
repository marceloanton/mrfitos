<?php

namespace App\Services;

use App\Repositories\ReportRepository;

final class ReportService
{
    public function __construct(private readonly ReportRepository $repo = new ReportRepository())
    {
    }

    public function renewalReport(int $tenantId, int $gymId, string $from, string $to): array
    {
        $rows = $this->repo->renewalReport($tenantId, $gymId, $from, $to);

        $items = array_map(function (array $r) {
            $status = $r['reminder_status'] ?? 'not_sent';
            if (!in_array($status, ['pending', 'sent', 'error'], true)) {
                $status = 'not_sent';
            }

            return [
                'membership_id' => (int) $r['membership_id'],
                'end_date' => $r['end_date'],
                'member_code' => $r['member_code'],
                'name' => trim(($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? '')),
                'phone' => $r['phone'],
                'plan_name' => $r['plan_name'],
                'reminder_status' => $status
            ];
        }, $rows);

        $summary = [
            'expected_renewals' => count($items),
            'sent' => count(array_filter($items, fn($i) => $i['reminder_status'] === 'sent')),
            'pending' => count(array_filter($items, fn($i) => $i['reminder_status'] === 'pending')),
            'error' => count(array_filter($items, fn($i) => $i['reminder_status'] === 'error')),
            'not_sent' => count(array_filter($items, fn($i) => $i['reminder_status'] === 'not_sent'))
        ];

        return ['summary' => $summary, 'items' => $items];
    }
}
