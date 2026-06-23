INSERT INTO employee_tb (employee_number, account_id, password, name, department, role, status, created_at, updated_at)
VALUES
    ('EMP001', 'admin', '$2a$10$WpPikpXqj9fC3k1PjL2B.euqIq.uL/fJ8R.R3A5x1aV2L7jM6J.uO', '김최고', '시스템관리팀', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW()),
    ('EMP002', 'manager1', '$2a$10$WpPikpXqj9fC3k1PjL2B.euqIq.uL/fJ8R.R3A5x1aV2L7jM6J.uO', '이매니', '콘서트기획팀', 'MANAGER', 'ACTIVE', NOW(), NOW()),
    ('EMP003', 'clerk1', '$2a$10$WpPikpXqj9fC3k1PjL2B.euqIq.uL/fJ8R.R3A5x1aV2L7jM6J.uO', '박사원', '고객지원팀', 'CLERK', 'ACTIVE', NOW(), NOW()),
    ('EMP004', 'clerk2', '$2a$10$WpPikpXqj9fC3k1PjL2B.euqIq.uL/fJ8R.R3A5x1aV2L7jM6J.uO', '정정지', '마케팅팀', 'CLERK', 'SUSPENDED', NOW(), NOW()),
    ('EMP005', 'clerk3', '$2a$10$WpPikpXqj9fC3k1PjL2B.euqIq.uL/fJ8R.R3A5x1aV2L7jM6J.uO', '최퇴사', '영업팀', 'CLERK', 'RESIGNED', NOW(), NOW());