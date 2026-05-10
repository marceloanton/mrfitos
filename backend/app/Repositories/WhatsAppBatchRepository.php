<?php

namespace App\Repositories;

use Core\Database;

final class WhatsAppBatchRepository
{
    public function createBatch(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO whatsapp_batches (tenant_id, gym_id, created_by_user_id, template_text, status, total_items, sent_items, error_items, created_at, updated_at)
             VALUES (:tenant_id, :gym_id, :created_by_user_id, :template_text, "pending", :total_items, 0, 0, NOW(), NOW())'
        );
        $stmt->execute($data);
        return (int) Database::connection()->lastInsertId();
    }

    public function createBatchItem(array $data): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO whatsapp_batch_items (batch_id, tenant_id, gym_id, member_id, membership_id, phone_normalized, message_text, whatsapp_link, send_status, created_at, updated_at)
             VALUES (:batch_id, :tenant_id, :gym_id, :member_id, :membership_id, :phone_normalized, :message_text, :whatsapp_link, "pending", NOW(), NOW())'
        );
        $stmt->execute($data);
    }

    public function listBatches(int $tenantId, int $gymId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, status, total_items, sent_items, error_items, created_at
             FROM whatsapp_batches
             WHERE tenant_id = :tenant_id AND gym_id = :gym_id
             ORDER BY id DESC
             LIMIT 100'
        );
        $stmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        return $stmt->fetchAll() ?: [];
    }

    public function listBatchItems(int $tenantId, int $gymId, int $batchId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, member_id, membership_id, phone_normalized, message_text, whatsapp_link, send_status, sent_at, error_message
             FROM whatsapp_batch_items
             WHERE tenant_id = :tenant_id AND gym_id = :gym_id AND batch_id = :batch_id
             ORDER BY id ASC'
        );
        $stmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId, 'batch_id' => $batchId]);
        return $stmt->fetchAll() ?: [];
    }

    public function updateItemStatus(int $tenantId, int $gymId, int $itemId, string $status, ?string $errorMessage): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE whatsapp_batch_items
             SET send_status = :send_status,
                 sent_at = CASE WHEN :send_status = "sent" THEN NOW() ELSE sent_at END,
                 error_message = :error_message,
                 updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id'
        );
        $stmt->execute([
            'send_status' => $status,
            'error_message' => $errorMessage,
            'id' => $itemId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
        return $stmt->rowCount() > 0;
    }

    public function refreshBatchCounters(int $tenantId, int $gymId, int $batchId): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE whatsapp_batches b
             SET
                sent_items = (SELECT COUNT(*) FROM whatsapp_batch_items i WHERE i.batch_id = b.id AND i.send_status = "sent"),
                error_items = (SELECT COUNT(*) FROM whatsapp_batch_items i WHERE i.batch_id = b.id AND i.send_status = "error"),
                status = CASE
                    WHEN (SELECT COUNT(*) FROM whatsapp_batch_items i WHERE i.batch_id = b.id AND i.send_status = "pending") = 0
                         AND (SELECT COUNT(*) FROM whatsapp_batch_items i WHERE i.batch_id = b.id AND i.send_status = "error") = 0 THEN "completed"
                    WHEN (SELECT COUNT(*) FROM whatsapp_batch_items i WHERE i.batch_id = b.id AND i.send_status = "pending") = 0
                         AND (SELECT COUNT(*) FROM whatsapp_batch_items i WHERE i.batch_id = b.id AND i.send_status = "error") > 0 THEN "partial"
                    ELSE "pending"
                END,
                updated_at = NOW()
             WHERE b.id = :id AND b.tenant_id = :tenant_id AND b.gym_id = :gym_id'
        );
        $stmt->execute(['id' => $batchId, 'tenant_id' => $tenantId, 'gym_id' => $gymId]);
    }
}
