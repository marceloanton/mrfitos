<?php

namespace App\Repositories;

use Core\Database;

final class ActivityLogRepository
{
    public function create(array $data): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO activity_logs (tenant_id, gym_id, user_id, entity_type, entity_id, action, metadata, ip_address, user_agent, created_at, updated_at)
             VALUES (:tenant_id, :gym_id, :user_id, :entity_type, :entity_id, :action, :metadata, :ip_address, :user_agent, NOW(), NOW())'
        );

        $stmt->execute([
            'tenant_id' => $data['tenant_id'],
            'gym_id' => $data['gym_id'],
            'user_id' => $data['user_id'],
            'entity_type' => $data['entity_type'],
            'entity_id' => $data['entity_id'],
            'action' => $data['action'],
            'metadata' => json_encode($data['metadata'], JSON_UNESCAPED_UNICODE),
            'ip_address' => $data['ip_address'],
            'user_agent' => $data['user_agent']
        ]);
    }

    public function countByActionForEntityType(string $entityType, ?int $tenantId, ?string $from, ?string $to): array
    {
        $where = ['entity_type = :entity_type'];
        $params = ['entity_type' => $entityType];

        if ($tenantId !== null && $tenantId > 0) {
            $where[] = 'tenant_id = :tenant_id';
            $params['tenant_id'] = $tenantId;
        }
        if ($from !== null && $from !== '') {
            $where[] = 'created_at >= :date_from';
            $params['date_from'] = $from . ' 00:00:00';
        }
        if ($to !== null && $to !== '') {
            $where[] = 'created_at <= :date_to';
            $params['date_to'] = $to . ' 23:59:59';
        }

        $sql = 'SELECT action, COUNT(*) AS total
                FROM activity_logs
                WHERE ' . implode(' AND ', $where) . '
                GROUP BY action
                ORDER BY total DESC, action ASC';

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll() ?: [];
    }

    public function countDailyByActionForEntityType(string $entityType, ?int $tenantId, ?string $from, ?string $to): array
    {
        $where = ['entity_type = :entity_type'];
        $params = ['entity_type' => $entityType];

        if ($tenantId !== null && $tenantId > 0) {
            $where[] = 'tenant_id = :tenant_id';
            $params['tenant_id'] = $tenantId;
        }
        if ($from !== null && $from !== '') {
            $where[] = 'created_at >= :date_from';
            $params['date_from'] = $from . ' 00:00:00';
        }
        if ($to !== null && $to !== '') {
            $where[] = 'created_at <= :date_to';
            $params['date_to'] = $to . ' 23:59:59';
        }

        $sql = 'SELECT DATE(created_at) AS date, action, COUNT(*) AS total
                FROM activity_logs
                WHERE ' . implode(' AND ', $where) . '
                GROUP BY DATE(created_at), action
                ORDER BY DATE(created_at) ASC, action ASC';

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll() ?: [];
    }

    public function countByContextAndActionForEntityType(string $entityType, ?int $tenantId, ?string $from, ?string $to): array
    {
        $where = ['entity_type = :entity_type'];
        $params = ['entity_type' => $entityType];

        if ($tenantId !== null && $tenantId > 0) {
            $where[] = 'tenant_id = :tenant_id';
            $params['tenant_id'] = $tenantId;
        }
        if ($from !== null && $from !== '') {
            $where[] = 'created_at >= :date_from';
            $params['date_from'] = $from . ' 00:00:00';
        }
        if ($to !== null && $to !== '') {
            $where[] = 'created_at <= :date_to';
            $params['date_to'] = $to . ' 23:59:59';
        }

        $sql = 'SELECT COALESCE(JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.context")), "unknown") AS context,
                       action,
                       COUNT(*) AS total
                FROM activity_logs
                WHERE ' . implode(' AND ', $where) . '
                GROUP BY context, action
                ORDER BY context ASC, total DESC, action ASC';

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll() ?: [];
    }

    public function listByEntityType(string $entityType, array $filters = []): array
    {
        $where = ['al.entity_type = :entity_type'];
        $params = ['entity_type' => $entityType];

        $tenantId = isset($filters['tenant_id']) ? (int) $filters['tenant_id'] : null;
        if ($tenantId !== null && $tenantId > 0) {
            $where[] = 'al.tenant_id = :tenant_id';
            $params['tenant_id'] = $tenantId;
        }

        $from = isset($filters['from']) ? trim((string) $filters['from']) : '';
        if ($from !== '') {
            $where[] = 'al.created_at >= :date_from';
            $params['date_from'] = $from . ' 00:00:00';
        }

        $to = isset($filters['to']) ? trim((string) $filters['to']) : '';
        if ($to !== '') {
            $where[] = 'al.created_at <= :date_to';
            $params['date_to'] = $to . ' 23:59:59';
        }

        $addonCode = isset($filters['addon_code']) ? trim((string) $filters['addon_code']) : '';
        if ($addonCode !== '') {
            $where[] = 'JSON_UNQUOTE(JSON_EXTRACT(al.metadata, "$.code")) = :addon_code';
            $params['addon_code'] = strtolower($addonCode);
        }

        $userId = isset($filters['user_id']) ? (int) $filters['user_id'] : 0;
        if ($userId > 0) {
            $where[] = 'al.user_id = :user_id';
            $params['user_id'] = $userId;
        }

        $page = max(1, (int) ($filters['page'] ?? 1));
        $perPage = (int) ($filters['per_page'] ?? 20);
        if ($perPage <= 0) {
            $perPage = 20;
        }
        $perPage = min($perPage, 100);
        $offset = ($page - 1) * $perPage;

        $countSql = 'SELECT COUNT(*) AS total FROM activity_logs al WHERE ' . implode(' AND ', $where);
        $countStmt = Database::connection()->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) ($countStmt->fetchColumn() ?: 0);

        $sql = 'SELECT al.id, al.tenant_id, al.gym_id, al.user_id, al.entity_type, al.entity_id, al.action,
                       al.metadata, al.ip_address, al.user_agent, al.created_at,
                       u.email AS user_email, u.first_name, u.last_name
                FROM activity_logs al
                LEFT JOIN users u ON u.id = al.user_id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY al.id DESC
                LIMIT :limit OFFSET :offset';

        $stmt = Database::connection()->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items' => $stmt->fetchAll() ?: [],
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => $perPage > 0 ? (int) ceil($total / $perPage) : 1
            ]
        ];
    }
}
