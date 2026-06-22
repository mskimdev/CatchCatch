package com.catchcatch.ticket.employee;

import lombok.Getter;

@Getter
public class SessionEmployee {

    private final Integer id;
    private final String employeeNumber; // 사번
    private final String accountId;      // 로그인 아이디
    private final String name;           // 직원 이름
    private final String department;     // 소속 부서
    private final EmployeeRole role;     // 직급/권한 (SUPER_ADMIN, MANAGER, CLERK)
    private final EmployeeStatus status; // 상태 (ACTIVE 등)

    // 엔티티를 세션 객체로 변환하는 생성자
    public SessionEmployee(Employee employee) {
        this.id = employee.getId();
        this.employeeNumber = employee.getEmployeeNumber();
        this.accountId = employee.getAccountId();
        this.name = employee.getName();
        this.department = employee.getDepartment();
        this.role = employee.getRole();
        this.status = employee.getStatus();
    }

    // 최고 관리자인지 확인
    public boolean isSuperAdmin() {
        return EmployeeRole.SUPER_ADMIN.equals(this.role);
    }

    // 중간 관리자 이상의 권한을 가졌는지 확인
    public boolean isManagerOrHigher() {
        return EmployeeRole.SUPER_ADMIN.equals(this.role) || EmployeeRole.MANAGER.equals(this.role);
    }
}