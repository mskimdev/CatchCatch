package com.catchcatch.ticket.employee;

import com.catchcatch.ticket.user.enums.Role;
import lombok.Getter;

@Getter
public class SessionEmployee {

    private final Integer id;
    private final String employeeNumber; // 사번
    private final String accountId;      // 로그인 아이디
    private final String name;           // 직원 이름
    private final String department;     // 소속 부서
    private final Role role;     // 직급/권한 (ADMIN, MANAGER, CLERK, USER)
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
}