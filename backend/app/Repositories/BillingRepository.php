<?php

namespace App\Repositories;

use Core\Database;

final class BillingRepository
{
    private const ALLOWED_SESSION_STATUSES = ['pending', 'approved', 'rejected', 'expired'];

    public function getLatestPricingUpdatedAt(): ?string
    {
        $stmt = Database::connection()->query(
            "SELECT GREATEST(
                COALESCE((SELECT MAX(updated_at) FROM subscription_plans), '1970-01-01 00:00:00'),
                COALESCE((SELECT MAX(updated_at) FROM addon_modules), '1970-01-01 00:00:00')
            ) AS latest_updated_at"
        );
        $value = $stmt->fetchColumn();
        return is_string($value) && trim($value) !== '' ? $value : null;
    }

    public function getActivePlansCatalog(): array
    {
        $stmt = Database::connection()->query(
            'SELECT code, name, price_monthly, currency, features, limits_json
             FROM subscription_plans
             WHERE is_active = 1
             ORDER BY price_monthly ASC, id ASC'
        );
        return $stmt->fetchAll() ?: [];
    }

    public function getActiveAddonsCatalog(): array
    {
        $stmt = Database::connection()->query(
            'SELECT code, name, description, price_monthly, currency, features
             FROM addon_modules
             WHERE is_active = 1
             ORDER BY price_monthly ASC, id ASC'
        );
        return $stmt->fetchAll() ?: [];
    }

    public function tenantExists(int $tenantId): bool
    {
        $stmt = Database::connection()->prepare(
            'SELECT id FROM tenants WHERE id = :tenant_id AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (bool) $stmt->fetchColumn();
    }

    public function findPlanByCode(string $planCode): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, code, name, price_monthly, currency
             FROM subscription_plans
             WHERE code = :code AND is_active = 1
             LIMIT 1'
        );
        $stmt->execute(['code' => $planCode]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findAddonByCode(string $addonCode): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, code, name, price_monthly, currency
             FROM addon_modules
             WHERE code = :code AND is_active = 1
             LIMIT 1'
        );
        $stmt->execute(['code' => $addonCode]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function createCheckoutSession(array $data): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO subscription_checkout_sessions (
                tenant_id, plan_id, addon_id, provider, provider_reference, provider_preference_id, provider_payment_id, checkout_url, amount, currency, status, expires_at, metadata, created_at, updated_at
             ) VALUES (
                :tenant_id, :plan_id, :addon_id, "mercadopago", :provider_reference, :provider_preference_id, :provider_payment_id, :checkout_url, :amount, :currency, "pending", :expires_at, :metadata, NOW(), NOW()
             )'
        );

        $stmt->execute([
            'tenant_id' => $data['tenant_id'],
            'plan_id' => $data['plan_id'],
            'addon_id' => $data['addon_id'],
            'provider_reference' => $data['provider_reference'],
            'provider_preference_id' => $data['provider_preference_id'],
            'provider_payment_id' => $data['provider_payment_id'],
            'checkout_url' => $data['checkout_url'],
            'amount' => $data['amount'],
            'currency' => $data['currency'],
            'expires_at' => $data['expires_at'],
            'metadata' => $data['metadata']
        ]);
    }

    public function findCheckoutSessionByPaymentId(string $paymentId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, tenant_id, plan_id, addon_id, provider_reference, status, processed_at, metadata
             FROM subscription_checkout_sessions
             WHERE provider_payment_id = :payment_id
             LIMIT 1'
        );
        $stmt->execute(['payment_id' => $paymentId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findCheckoutSessionByPreferenceId(string $preferenceId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, tenant_id, plan_id, addon_id, provider_reference, status, processed_at, metadata
             FROM subscription_checkout_sessions
             WHERE provider_preference_id = :preference_id
             LIMIT 1'
        );
        $stmt->execute(['preference_id' => $preferenceId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findCheckoutSessionByReference(string $providerReference): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, tenant_id, plan_id, addon_id, provider_reference, provider_preference_id, provider_payment_id, status, processed_at, metadata
             FROM subscription_checkout_sessions
             WHERE provider_reference = :provider_reference
             LIMIT 1'
        );
        $stmt->execute(['provider_reference' => $providerReference]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findCheckoutSessionPublicStatusByReference(string $providerReference): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT
                s.provider_reference,
                s.status,
                s.amount,
                s.currency,
                s.checkout_url,
                s.created_at,
                s.processed_at,
                p.code AS plan_code,
                a.code AS addon_code
             FROM subscription_checkout_sessions s
             LEFT JOIN subscription_plans p ON p.id = s.plan_id
             LEFT JOIN addon_modules a ON a.id = s.addon_id
             WHERE s.provider_reference = :provider_reference
             LIMIT 1'
        );
        $stmt->execute(['provider_reference' => $providerReference]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function updateCheckoutSessionStatus(int $sessionId, string $status): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE subscription_checkout_sessions
             SET status = :status, updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $sessionId,
            'status' => $status
        ]);
    }

    public function updateCheckoutSessionWebhookData(int $sessionId, string $status, ?string $paymentId, ?string $metadata): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE subscription_checkout_sessions
             SET status = :status,
                 provider_payment_id = COALESCE(:payment_id, provider_payment_id),
                 metadata = :metadata,
                 updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $sessionId,
            'status' => $status,
            'payment_id' => $paymentId,
            'metadata' => $metadata
        ]);
    }

    public function markSessionProcessed(int $sessionId): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE subscription_checkout_sessions
             SET processed_at = NOW(), updated_at = NOW()
             WHERE id = :id AND processed_at IS NULL'
        );
        $stmt->execute(['id' => $sessionId]);
    }

    public function listCheckoutSessions(array $filters, int $offset, int $limit): array
    {
        [$whereSql, $params] = $this->buildCheckoutSessionFilters($filters);
        $sql = 'SELECT
                    s.id,
                    s.tenant_id,
                    s.provider_reference,
                    s.status,
                    s.amount,
                    s.currency,
                    p.code AS plan_code,
                    a.code AS addon_code,
                    s.created_at,
                    s.processed_at
                FROM subscription_checkout_sessions s
                LEFT JOIN subscription_plans p ON p.id = s.plan_id
                LEFT JOIN addon_modules a ON a.id = s.addon_id'
            . $whereSql .
            ' ORDER BY s.created_at DESC, s.id DESC
              LIMIT :limit OFFSET :offset';

        $stmt = Database::connection()->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll() ?: [];
    }

    public function countCheckoutSessions(array $filters): int
    {
        [$whereSql, $params] = $this->buildCheckoutSessionFilters($filters);
        $sql = 'SELECT COUNT(*) AS total FROM subscription_checkout_sessions s' . $whereSql;
        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);
        return (int) ($stmt->fetchColumn() ?: 0);
    }

    public function listCheckoutSessionsForExport(array $filters): array
    {
        [$whereSql, $params] = $this->buildCheckoutSessionFilters($filters);
        $sql = 'SELECT
                    s.id,
                    s.tenant_id,
                    s.provider_reference,
                    s.status,
                    s.amount,
                    s.currency,
                    p.code AS plan_code,
                    a.code AS addon_code,
                    s.created_at,
                    s.processed_at
                FROM subscription_checkout_sessions s
                LEFT JOIN subscription_plans p ON p.id = s.plan_id
                LEFT JOIN addon_modules a ON a.id = s.addon_id'
            . $whereSql .
            ' ORDER BY s.created_at DESC, s.id DESC';

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll() ?: [];
    }

    public function checkoutFunnelSummary(array $filters): array
    {
        [$whereSql, $params] = $this->buildCheckoutSessionFilters($filters);
        $sql = 'SELECT
                    COUNT(*) AS total_sessions,
                    SUM(CASE WHEN s.status = "approved" THEN 1 ELSE 0 END) AS approved,
                    SUM(CASE WHEN s.status = "pending" THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN s.status = "rejected" THEN 1 ELSE 0 END) AS rejected,
                    SUM(CASE WHEN s.status = "expired" THEN 1 ELSE 0 END) AS expired
                FROM subscription_checkout_sessions s'
            . $whereSql;
        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row ?: [
            'total_sessions' => 0,
            'approved' => 0,
            'pending' => 0,
            'rejected' => 0,
            'expired' => 0
        ];
    }

    private function buildCheckoutSessionFilters(array $filters): array
    {
        $where = [];
        $params = [];

        if (isset($filters['tenant_id']) && (int) $filters['tenant_id'] > 0) {
            $where[] = 's.tenant_id = :tenant_id';
            $params['tenant_id'] = (int) $filters['tenant_id'];
        }

        if (isset($filters['status']) && in_array($filters['status'], self::ALLOWED_SESSION_STATUSES, true)) {
            $where[] = 's.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['from'])) {
            $where[] = 's.created_at >= :date_from';
            $params['date_from'] = $filters['from'] . ' 00:00:00';
        }

        if (!empty($filters['to'])) {
            $where[] = 's.created_at <= :date_to';
            $params['date_to'] = $filters['to'] . ' 23:59:59';
        }

        $whereSql = empty($where) ? '' : (' WHERE ' . implode(' AND ', $where));
        return [$whereSql, $params];
    }
}
