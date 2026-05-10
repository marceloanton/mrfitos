<?php

namespace App\Services;

use App\Repositories\AttendanceRepository;
use Core\Database;

final class AttendanceService
{
    public function __construct(private readonly AttendanceRepository $attendance = new AttendanceRepository())
    {
    }

    public function list(int $tenantId, int $gymId, ?string $date, int $page, int $perPage): array
    {
        return $this->attendance->list($tenantId, $gymId, $date, $page, $perPage);
    }

    public function checkInByCode(int $tenantId, int $gymId, string $memberCode, string $source = 'qr'): array
    {
        $memberCode = trim($memberCode);
        if ($memberCode === '') {
            throw new \InvalidArgumentException('member_code is required');
        }

        $member = $this->attendance->findMemberByCode($tenantId, $gymId, $memberCode);
        if (!$member) {
            throw new \RuntimeException('Member not found', 404);
        }

        if ($member['status'] !== 'active') {
            $this->attendance->createCheckIn([
                'tenant_id' => $tenantId,
                'gym_id' => $gymId,
                'member_id' => (int) $member['id'],
                'check_out_at' => date('Y-m-d H:i:s'),
                'access_granted' => 0,
                'source' => $source,
                'notes' => 'Denied: inactive member'
            ]);

            throw new \RuntimeException('Member is not active', 403);
        }

        if (!$this->attendance->hasActiveMembership($tenantId, $gymId, (int) $member['id'])) {
            $this->attendance->createCheckIn([
                'tenant_id' => $tenantId,
                'gym_id' => $gymId,
                'member_id' => (int) $member['id'],
                'check_out_at' => date('Y-m-d H:i:s'),
                'access_granted' => 0,
                'source' => $source,
                'notes' => 'Denied: no active membership'
            ]);

            throw new \RuntimeException('Member has no active membership', 403);
        }

        $conn = Database::connection();
        $conn->beginTransaction();
        try {
            $this->attendance->lockMemberForAttendance($tenantId, $gymId, (int) $member['id']);
            $open = $this->attendance->findOpenAttendance($tenantId, $gymId, (int) $member['id']);
            if ($open) {
                $conn->rollBack();
                throw new \RuntimeException('Member already checked-in', 409);
            }

            $attendanceId = $this->attendance->createCheckIn([
                'tenant_id' => $tenantId,
                'gym_id' => $gymId,
                'member_id' => (int) $member['id'],
                'check_out_at' => null,
                'access_granted' => 1,
                'source' => in_array($source, ['manual', 'qr', 'rfid', 'biometric', 'api'], true) ? $source : 'manual',
                'notes' => null
            ]);
            $conn->commit();
        } catch (\RuntimeException $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        } catch (\Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw new \RuntimeException('Could not perform check-in', 500);
        }

        return [
            'attendance_id' => $attendanceId,
            'member' => [
                'id' => (int) $member['id'],
                'member_code' => $member['member_code'],
                'name' => trim($member['first_name'] . ' ' . $member['last_name'])
            ]
        ];
    }

    public function checkOutByCode(int $tenantId, int $gymId, string $memberCode): array
    {
        $memberCode = trim($memberCode);
        if ($memberCode === '') {
            throw new \InvalidArgumentException('member_code is required');
        }

        $member = $this->attendance->findMemberByCode($tenantId, $gymId, $memberCode);
        if (!$member) {
            throw new \RuntimeException('Member not found', 404);
        }

        $open = $this->attendance->findOpenAttendance($tenantId, $gymId, (int) $member['id']);
        if (!$open) {
            throw new \RuntimeException('Member has no active check-in', 409);
        }

        $ok = $this->attendance->closeAttendance($tenantId, $gymId, (int) $open['id']);
        if (!$ok) {
            throw new \RuntimeException('Could not perform checkout', 500);
        }

        return [
            'attendance_id' => (int) $open['id'],
            'member' => [
                'id' => (int) $member['id'],
                'member_code' => $member['member_code'],
                'name' => trim($member['first_name'] . ' ' . $member['last_name'])
            ]
        ];
    }
}
