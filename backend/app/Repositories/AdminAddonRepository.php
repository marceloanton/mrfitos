<?php

namespace App\Repositories;

use Core\Database;

final class AdminAddonRepository
{
    public function tenantExists(int $tenantId): bool
    {
        $stmt = Database::connection()->prepare(
            'SELECT id FROM tenants WHERE id = :tenant_id AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (bool) $stmt->fetchColumn();
    }

    public function findAddonByCode(string $addonCode): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, code, name, description, price_monthly, currency, features, is_active
             FROM addon_modules
             WHERE code = :code AND is_active = 1
             LIMIT 1'
        );
        $stmt->execute(['code' => $addonCode]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findCatalogAddonByCode(string $addonCode): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, code, name, description, price_monthly, currency, features, is_active
             FROM addon_modules
             WHERE code = :code
             LIMIT 1'
        );
        $stmt->execute(['code' => $addonCode]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function getAllAvailableAddons(): array
    {
        $stmt = Database::connection()->query(
            'SELECT id, code, name, description, price_monthly, currency, features, is_active
             FROM addon_modules
             WHERE is_active = 1
             ORDER BY id ASC'
        );
        return $stmt->fetchAll() ?: [];
    }

    public function getAllCatalogAddons(): array
    {
        $stmt = Database::connection()->query(
            'SELECT id, code, name, description, price_monthly, currency, features, is_active
             FROM addon_modules
             ORDER BY id ASC'
        );
        return $stmt->fetchAll() ?: [];
    }

    public function getAddonAdoptionCounts(): array
    {
        $stmt = Database::connection()->query(
            'SELECT tas.addon_id, COUNT(DISTINCT tas.tenant_id) AS active_tenants
             FROM tenant_addon_subscriptions tas
             WHERE tas.status = "active"
               AND (tas.ends_at IS NULL OR tas.ends_at >= NOW())
             GROUP BY tas.addon_id'
        );
        $rows = $stmt->fetchAll() ?: [];
        $map = [];
        foreach ($rows as $row) {
            $map[(int) ($row['addon_id'] ?? 0)] = (int) ($row['active_tenants'] ?? 0);
        }
        return $map;
    }

    public function getActiveAddonSubscriptionsByTenant(int $tenantId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT tas.id, tas.tenant_id, tas.addon_id, tas.status, tas.started_at, tas.ends_at,
                    am.code, am.name, am.description, am.price_monthly, am.currency, am.features
             FROM tenant_addon_subscriptions tas
             INNER JOIN addon_modules am ON am.id = tas.addon_id
             WHERE tas.tenant_id = :tenant_id
               AND tas.status = "active"
               AND am.is_active = 1
               AND (tas.ends_at IS NULL OR tas.ends_at >= NOW())
             ORDER BY tas.id DESC'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return $stmt->fetchAll() ?: [];
    }

    public function getActiveAddonSubscriptionByTenantAndAddon(int $tenantId, int $addonId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, tenant_id, addon_id, status, started_at, ends_at
             FROM tenant_addon_subscriptions
             WHERE tenant_id = :tenant_id
               AND addon_id = :addon_id
               AND status = "active"
               AND (ends_at IS NULL OR ends_at >= NOW())
             ORDER BY id DESC
             LIMIT 1'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'addon_id' => $addonId
        ]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function activateAddon(int $tenantId, int $addonId, string $startedAt): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO tenant_addon_subscriptions (tenant_id, addon_id, status, started_at, ends_at, created_at, updated_at)
             VALUES (:tenant_id, :addon_id, "active", :started_at, NULL, NOW(), NOW())'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'addon_id' => $addonId,
            'started_at' => $startedAt
        ]);
    }

    public function deactivateAddon(int $tenantId, int $addonId, string $endedAt): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE tenant_addon_subscriptions
             SET status = "cancelled", ends_at = :ended_at, updated_at = NOW()
             WHERE tenant_id = :tenant_id
               AND addon_id = :addon_id
               AND status = "active"
               AND (ends_at IS NULL OR ends_at > :ended_at)'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'addon_id' => $addonId,
            'ended_at' => $endedAt
        ]);
    }

    public function updateCatalogAddonByCode(string $addonCode, array $payload): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE addon_modules
             SET name = :name,
                 description = :description,
                 price_monthly = :price_monthly,
                 is_active = :is_active,
                 updated_at = NOW()
             WHERE code = :code'
        );
        $stmt->execute([
            'code' => $addonCode,
            'name' => $payload['name'],
            'description' => $payload['description'],
            'price_monthly' => $payload['price_monthly'],
            'is_active' => $payload['is_active'],
        ]);
    }
}
