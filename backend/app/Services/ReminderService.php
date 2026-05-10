<?php

namespace App\Services;

use App\Repositories\ActivityLogRepository;
use App\Repositories\ReminderRepository;
use App\Repositories\WhatsAppBatchRepository;

final class ReminderService
{
    public function __construct(
        private readonly ReminderRepository $repo = new ReminderRepository(),
        private readonly ActivityLogRepository $activity = new ActivityLogRepository(),
        private readonly WhatsAppBatchRepository $batches = new WhatsAppBatchRepository()
    ) {
    }

    public function expiringMemberships(int $tenantId, int $gymId, int $daysAhead): array
    {
        $daysAhead = max(0, min(30, $daysAhead));
        $items = $this->repo->expiringMemberships($tenantId, $gymId, $daysAhead);

        return array_map(fn(array $row) => $this->buildReminderItem($row), $items);
    }

    public function buildBatch(int $tenantId, int $gymId, int $userId, array $membershipIds, string $template, string $ip, string $ua): array
    {
        $membershipIds = array_values(array_unique(array_map('intval', $membershipIds)));
        $membershipIds = array_values(array_filter($membershipIds, fn(int $id) => $id > 0));
        if ($membershipIds === []) {
            throw new \InvalidArgumentException('membership_ids is required');
        }

        $template = trim($template);
        if ($template === '') {
            $template = 'Hola {{name}}, te recordamos que tu plan {{plan_name}} vence el {{end_date}}. Si queres renovarlo, respondé este mensaje.';
        }

        $rows = $this->repo->findMembershipsForReminders($tenantId, $gymId, $membershipIds);
        $items = array_map(function (array $row) use ($template) {
            $item = $this->buildReminderItem($row);
            $message = strtr($template, [
                '{{name}}' => $item['name'] !== '' ? $item['name'] : 'socio',
                '{{plan_name}}' => (string) ($item['plan_name'] ?? ''),
                '{{end_date}}' => (string) ($item['end_date'] ?? ''),
                '{{member_code}}' => (string) ($item['member_code'] ?? '')
            ]);
            $phone = $item['phone_normalized'] ?? null;
            $item['message'] = $message;
            $item['whatsapp_link'] = $phone ? 'https://wa.me/' . $phone . '?text=' . rawurlencode($message) : null;
            return $item;
        }, $rows);

        $batchId = $this->batches->createBatch([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'created_by_user_id' => $userId,
            'template_text' => $template,
            'total_items' => count($items)
        ]);

        foreach ($items as $item) {
            $this->batches->createBatchItem([
                'batch_id' => $batchId,
                'tenant_id' => $tenantId,
                'gym_id' => $gymId,
                'member_id' => $item['member_id'],
                'membership_id' => $item['membership_id'],
                'phone_normalized' => $item['phone_normalized'],
                'message_text' => $item['message'],
                'whatsapp_link' => $item['whatsapp_link']
            ]);
        }

        $this->activity->create([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'user_id' => $userId,
            'entity_type' => 'reminder_batch',
            'entity_id' => null,
            'action' => 'whatsapp_batch_generated',
            'metadata' => [
                'batch_id' => $batchId,
                'selected_memberships' => count($membershipIds),
                'resolved_items' => count($items),
                'template' => $template
            ],
            'ip_address' => $ip,
            'user_agent' => $ua
        ]);

        return ['batch_id' => $batchId, 'items' => $items, 'total' => count($items), 'template' => $template];
    }

    public function listBatches(int $tenantId, int $gymId): array
    {
        return $this->batches->listBatches($tenantId, $gymId);
    }

    public function getBatchItems(int $tenantId, int $gymId, int $batchId): array
    {
        return $this->batches->listBatchItems($tenantId, $gymId, $batchId);
    }

    public function updateBatchItemStatus(int $tenantId, int $gymId, int $batchId, int $itemId, string $status, ?string $errorMessage): bool
    {
        if (!in_array($status, ['pending', 'sent', 'error'], true)) {
            throw new \InvalidArgumentException('Invalid status');
        }

        $ok = $this->batches->updateItemStatus($tenantId, $gymId, $itemId, $status, $errorMessage);
        if ($ok) {
            $this->batches->refreshBatchCounters($tenantId, $gymId, $batchId);
        }
        return $ok;
    }

    private function buildReminderItem(array $row): array
    {
        $phone = preg_replace('/\D+/', '', (string) ($row['phone'] ?? ''));
        $fullName = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
        $endDate = (string) $row['end_date'];
        $message = sprintf(
            'Hola %s, te recordamos que tu plan %s vence el %s. Si queres renovarlo, respondé este mensaje.',
            $fullName !== '' ? $fullName : 'socio',
            (string) ($row['plan_name'] ?? 'actual'),
            $endDate
        );

        $waLink = $phone !== ''
            ? 'https://wa.me/' . $phone . '?text=' . rawurlencode($message)
            : null;

        return [
            'member_id' => (int) $row['member_id'],
            'membership_id' => (int) $row['membership_id'],
            'member_code' => $row['member_code'],
            'name' => $fullName,
            'phone' => $row['phone'],
            'phone_normalized' => $phone !== '' ? $phone : null,
            'plan_name' => $row['plan_name'],
            'end_date' => $endDate,
            'message' => $message,
            'whatsapp_link' => $waLink
        ];
    }
}
