<?php

namespace App\Services;

use App\Repositories\ActivityLogRepository;

final class TrackingService
{
    private const DEFAULT_DAYS_WINDOW = 31;

    public function __construct(
        private readonly ActivityLogRepository $activity = new ActivityLogRepository()
    ) {
    }

    public function trackEvent(int $tenantId, int $gymId, int $userId, array $payload, ?string $ip, ?string $ua): void
    {
        $eventName = trim((string) ($payload['event_name'] ?? ''));
        if ($eventName === '') {
            throw new \InvalidArgumentException('event_name is required');
        }
        if (mb_strlen($eventName) > 100) {
            throw new \InvalidArgumentException('event_name max length is 100');
        }

        $context = null;
        if (array_key_exists('context', $payload) && $payload['context'] !== null) {
            $context = trim((string) $payload['context']);
            if (mb_strlen($context) > 100) {
                throw new \InvalidArgumentException('context max length is 100');
            }
        }

        $metadata = $payload['metadata'] ?? [];
        if (!is_array($metadata)) {
            throw new \InvalidArgumentException('metadata must be an array');
        }

        $this->activity->create([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'user_id' => $userId,
            'entity_type' => 'upgrade_tracking',
            'entity_id' => null,
            'action' => $eventName,
            'metadata' => [
                'context' => $context,
                'metadata' => $metadata
            ],
            'ip_address' => $ip,
            'user_agent' => $ua
        ]);
    }

    public function summary(array $query): array
    {
        $filters = $this->normalizeSummaryFilters($query);
        $entityType = 'upgrade_tracking';

        $totalsRows = $this->activity->countByActionForEntityType(
            $entityType,
            $filters['tenant_id'],
            $filters['from'],
            $filters['to']
        );
        $dailyRows = $this->activity->countDailyByActionForEntityType(
            $entityType,
            $filters['tenant_id'],
            $filters['from'],
            $filters['to']
        );
        $contextRows = $this->activity->countByContextAndActionForEntityType(
            $entityType,
            $filters['tenant_id'],
            $filters['from'],
            $filters['to']
        );

        $totals = array_map(static fn (array $row): array => [
            'event_name' => (string) ($row['action'] ?? ''),
            'count' => (int) ($row['total'] ?? 0),
        ], $totalsRows);

        $daily = array_map(static fn (array $row): array => [
            'date' => (string) ($row['date'] ?? ''),
            'event_name' => (string) ($row['action'] ?? ''),
            'count' => (int) ($row['total'] ?? 0),
        ], $dailyRows);

        $byContext = [];
        foreach ($contextRows as $row) {
            $context = (string) ($row['context'] ?? 'unknown');
            $event = (string) ($row['action'] ?? '');
            $count = (int) ($row['total'] ?? 0);
            if (!isset($byContext[$context])) {
                $byContext[$context] = [];
            }
            $byContext[$context][$event] = $count;
        }

        return [
            'filters' => [
                'tenant_id' => $filters['tenant_id'],
                'from' => $filters['from'],
                'to' => $filters['to'],
                'max_days' => self::DEFAULT_DAYS_WINDOW,
            ],
            'totals' => $totals,
            'daily' => $daily,
            'by_context' => $byContext,
        ];
    }

    private function normalizeSummaryFilters(array $query): array
    {
        $tenantId = (int) ($query['tenant_id'] ?? 0);
        $from = trim((string) ($query['from'] ?? ''));
        $to = trim((string) ($query['to'] ?? ''));

        if ($tenantId < 0) {
            throw new \InvalidArgumentException('tenant_id must be a positive integer');
        }
        if ($from !== '' && !$this->isValidDateYmd($from)) {
            throw new \InvalidArgumentException('Invalid from date format. Use YYYY-MM-DD');
        }
        if ($to !== '' && !$this->isValidDateYmd($to)) {
            throw new \InvalidArgumentException('Invalid to date format. Use YYYY-MM-DD');
        }

        if ($from === '' && $to === '') {
            $today = new \DateTimeImmutable('today');
            $from = $today->modify('-' . (self::DEFAULT_DAYS_WINDOW - 1) . ' days')->format('Y-m-d');
            $to = $today->format('Y-m-d');
        } elseif ($from === '') {
            $end = new \DateTimeImmutable($to);
            $from = $end->modify('-' . (self::DEFAULT_DAYS_WINDOW - 1) . ' days')->format('Y-m-d');
        } elseif ($to === '') {
            $start = new \DateTimeImmutable($from);
            $to = $start->modify('+' . (self::DEFAULT_DAYS_WINDOW - 1) . ' days')->format('Y-m-d');
        }

        if (strcmp($from, $to) > 0) {
            throw new \InvalidArgumentException('from date must be less than or equal to to date');
        }

        $days = (int) ((new \DateTimeImmutable($from))->diff(new \DateTimeImmutable($to))->format('%a')) + 1;
        if ($days > self::DEFAULT_DAYS_WINDOW) {
            throw new \InvalidArgumentException('Date range exceeds 31 days');
        }

        return [
            'tenant_id' => $tenantId > 0 ? $tenantId : null,
            'from' => $from,
            'to' => $to,
        ];
    }

    private function isValidDateYmd(string $date): bool
    {
        $dt = \DateTimeImmutable::createFromFormat('Y-m-d', $date);
        return $dt !== false && $dt->format('Y-m-d') === $date;
    }
}
