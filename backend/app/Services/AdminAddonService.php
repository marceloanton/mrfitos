<?php

namespace App\Services;

use App\Repositories\AdminAddonRepository;
use App\Repositories\ActivityLogRepository;
use Core\Database;

final class AdminAddonService
{
    public function __construct(
        private readonly AdminAddonRepository $repo = new AdminAddonRepository(),
        private readonly ActivityLogRepository $activity = new ActivityLogRepository()
    )
    {
    }

    public function getTenantAddonOverview(int $tenantId): array
    {
        if (!$this->repo->tenantExists($tenantId)) {
            throw new \InvalidArgumentException('Tenant not found');
        }

        $activeSubs = $this->repo->getActiveAddonSubscriptionsByTenant($tenantId);
        $available = $this->repo->getAllAvailableAddons();
        $activeCodes = [];

        $activeAddons = array_map(function (array $row) use (&$activeCodes): array {
            $activeCodes[(string) $row['code']] = true;
            $features = json_decode((string) ($row['features'] ?? '[]'), true);
            return [
                'code' => (string) $row['code'],
                'name' => (string) $row['name'],
                'description' => (string) ($row['description'] ?? ''),
                'price_monthly' => (float) $row['price_monthly'],
                'currency' => (string) $row['currency'],
                'features' => is_array($features) ? $features : [],
                'status' => (string) $row['status'],
                'started_at' => (string) $row['started_at'],
                'ends_at' => $row['ends_at']
            ];
        }, $activeSubs);

        $addons = array_map(function (array $row) use ($activeCodes): array {
            $features = json_decode((string) ($row['features'] ?? '[]'), true);
            $code = (string) $row['code'];
            return [
                'code' => $code,
                'name' => (string) $row['name'],
                'description' => (string) ($row['description'] ?? ''),
                'price_monthly' => (float) $row['price_monthly'],
                'currency' => (string) $row['currency'],
                'features' => is_array($features) ? $features : [],
                'active' => (bool) ($activeCodes[$code] ?? false)
            ];
        }, $available);

        return [
            'tenant' => [
                'id' => $tenantId
            ],
            'active_addons' => $activeAddons,
            'addons' => $addons
        ];
    }

    public function getAddonCatalogSummary(): array
    {
        $addons = $this->repo->getAllCatalogAddons();
        $adoptionMap = $this->repo->getAddonAdoptionCounts();

        $items = array_map(function (array $row) use ($adoptionMap): array {
            $addonId = (int) ($row['id'] ?? 0);
            $features = json_decode((string) ($row['features'] ?? '[]'), true);
            return [
                'id' => $addonId,
                'code' => (string) ($row['code'] ?? ''),
                'name' => (string) ($row['name'] ?? ''),
                'description' => (string) ($row['description'] ?? ''),
                'price_monthly' => (float) ($row['price_monthly'] ?? 0),
                'currency' => strtoupper((string) ($row['currency'] ?? 'USD')),
                'features' => is_array($features) ? $features : [],
                'is_active' => (bool) ($row['is_active'] ?? true),
                'active_tenants' => (int) ($adoptionMap[$addonId] ?? 0)
            ];
        }, $addons);

        usort($items, static fn (array $a, array $b): int => $b['active_tenants'] <=> $a['active_tenants']);
        return [
            'items' => $items,
            'total' => count($items)
        ];
    }

    public function getCatalogAudit(array $filters = []): array
    {
        $tenantId = isset($filters['tenant_id']) ? (int) $filters['tenant_id'] : 0;
        if ($tenantId <= 0) {
            throw new \InvalidArgumentException('tenant_id is required');
        }

        $result = $this->activity->listByEntityType('addon_catalog', [
            'tenant_id' => $tenantId,
            'from' => $filters['from'] ?? null,
            'to' => $filters['to'] ?? null,
            'addon_code' => $filters['addon_code'] ?? null,
            'user_id' => $filters['user_id'] ?? null,
            'page' => $filters['page'] ?? 1,
            'per_page' => $filters['per_page'] ?? 20,
        ]);

        $items = array_map(static function (array $row): array {
            $metadata = json_decode((string) ($row['metadata'] ?? '{}'), true);
            return [
                'id' => (int) ($row['id'] ?? 0),
                'created_at' => (string) ($row['created_at'] ?? ''),
                'addon_code' => (string) ($metadata['code'] ?? ''),
                'action' => (string) ($row['action'] ?? ''),
                'user' => [
                    'id' => isset($row['user_id']) ? (int) $row['user_id'] : null,
                    'email' => (string) ($row['user_email'] ?? ''),
                    'name' => trim(((string) ($row['first_name'] ?? '')) . ' ' . ((string) ($row['last_name'] ?? '')))
                ],
                'before' => is_array($metadata['before'] ?? null) ? $metadata['before'] : [],
                'after' => is_array($metadata['after'] ?? null) ? $metadata['after'] : [],
                'ip_address' => (string) ($row['ip_address'] ?? ''),
            ];
        }, $result['items']);

        return [
            'items' => $items,
            'pagination' => $result['pagination']
        ];
    }

    public function exportCatalogAudit(array $filters = []): array
    {
        $tenantId = isset($filters['tenant_id']) ? (int) $filters['tenant_id'] : 0;
        if ($tenantId <= 0) {
            throw new \InvalidArgumentException('tenant_id is required');
        }

        $page = max(1, (int) ($filters['page'] ?? 1));
        $perPage = (int) ($filters['per_page'] ?? 1000);
        if ($perPage <= 0) {
            $perPage = 1000;
        }
        $perPage = min($perPage, 5000);

        $result = $this->activity->listByEntityType('addon_catalog', [
            'tenant_id' => $tenantId,
            'from' => $filters['from'] ?? null,
            'to' => $filters['to'] ?? null,
            'addon_code' => $filters['addon_code'] ?? null,
            'user_id' => $filters['user_id'] ?? null,
            'page' => $page,
            'per_page' => $perPage,
        ]);

        return array_map(static function (array $row): array {
            $metadata = json_decode((string) ($row['metadata'] ?? '{}'), true);
            $before = is_array($metadata['before'] ?? null) ? $metadata['before'] : [];
            $after = is_array($metadata['after'] ?? null) ? $metadata['after'] : [];
            return [
                'created_at' => (string) ($row['created_at'] ?? ''),
                'addon_code' => (string) ($metadata['code'] ?? ''),
                'user_email' => (string) ($row['user_email'] ?? ''),
                'user_name' => trim(((string) ($row['first_name'] ?? '')) . ' ' . ((string) ($row['last_name'] ?? ''))),
                'before_price_monthly' => (string) ($before['price_monthly'] ?? ''),
                'after_price_monthly' => (string) ($after['price_monthly'] ?? ''),
                'before_is_active' => (string) (($before['is_active'] ?? '') === '' ? '' : ((bool) $before['is_active'] ? '1' : '0')),
                'after_is_active' => (string) (($after['is_active'] ?? '') === '' ? '' : ((bool) $after['is_active'] ? '1' : '0')),
                'ip_address' => (string) ($row['ip_address'] ?? ''),
            ];
        }, $result['items']);
    }

    public function updateCatalogAddon(string $addonCode, array $payload, array $actor = []): array
    {
        $addonCode = strtolower(trim($addonCode));
        if ($addonCode === '') {
            throw new \InvalidArgumentException('addon_code is required');
        }

        $current = $this->repo->findCatalogAddonByCode($addonCode);
        if (!$current) {
            throw new \InvalidArgumentException('Addon not found');
        }

        $name = trim((string) ($payload['name'] ?? $current['name'] ?? ''));
        $description = trim((string) ($payload['description'] ?? $current['description'] ?? ''));
        $priceMonthly = isset($payload['price_monthly']) ? (float) $payload['price_monthly'] : (float) ($current['price_monthly'] ?? 0);
        $isActive = array_key_exists('is_active', $payload) ? (bool) $payload['is_active'] : ((int) ($current['is_active'] ?? 1) === 1);

        if ($name === '') {
            throw new \InvalidArgumentException('name is required');
        }
        if ($priceMonthly < 0) {
            throw new \InvalidArgumentException('price_monthly must be >= 0');
        }

        $next = [
            'name' => substr($name, 0, 100),
            'description' => substr($description, 0, 255),
            'price_monthly' => $priceMonthly,
            'is_active' => $isActive ? 1 : 0,
        ];

        $this->repo->updateCatalogAddonByCode($addonCode, $next);

        $tenantIdForLog = (int) ($actor['tenant_id'] ?? 0);
        if ($tenantIdForLog > 0) {
            try {
                $this->activity->create([
                    'tenant_id' => $tenantIdForLog,
                    'gym_id' => isset($actor['gym_id']) ? (int) $actor['gym_id'] : null,
                    'user_id' => isset($actor['user_id']) ? (int) $actor['user_id'] : null,
                    'entity_type' => 'addon_catalog',
                    'entity_id' => (int) ($current['id'] ?? 0),
                    'action' => 'catalog_updated',
                    'metadata' => [
                        'code' => $addonCode,
                        'before' => [
                            'name' => (string) ($current['name'] ?? ''),
                            'description' => (string) ($current['description'] ?? ''),
                            'price_monthly' => (float) ($current['price_monthly'] ?? 0),
                            'is_active' => (bool) ((int) ($current['is_active'] ?? 1) === 1),
                        ],
                        'after' => [
                            'name' => (string) $next['name'],
                            'description' => (string) $next['description'],
                            'price_monthly' => (float) $next['price_monthly'],
                            'is_active' => (bool) ((int) $next['is_active'] === 1),
                        ]
                    ],
                    'ip_address' => (string) ($actor['ip_address'] ?? ''),
                    'user_agent' => (string) ($actor['user_agent'] ?? '')
                ]);
            } catch (\Throwable) {
                // Best-effort audit logging: do not block catalog updates on log failures.
            }
        }

        return $this->getAddonCatalogSummary();
    }

    public function setAddonState(int $tenantId, string $addonCode, bool $active): array
    {
        if (!$this->repo->tenantExists($tenantId)) {
            throw new \InvalidArgumentException('Tenant not found');
        }

        $addon = $this->repo->findAddonByCode($addonCode);
        if (!$addon) {
            throw new \InvalidArgumentException('Addon not found or inactive');
        }

        $now = date('Y-m-d H:i:s');
        $addonId = (int) $addon['id'];
        $existing = $this->repo->getActiveAddonSubscriptionByTenantAndAddon($tenantId, $addonId);

        $conn = Database::connection();
        $conn->beginTransaction();
        try {
            if ($active && !$existing) {
                $this->repo->activateAddon($tenantId, $addonId, $now);
            }
            if (!$active && $existing) {
                $this->repo->deactivateAddon($tenantId, $addonId, $now);
            }
            $conn->commit();
        } catch (\Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }

        return $this->getTenantAddonOverview($tenantId);
    }
}
