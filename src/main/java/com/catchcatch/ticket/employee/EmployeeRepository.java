package com.catchcatch.ticket.employee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EmployeeRepository extends JpaRepository<Employee, Integer> {

    // 사원번호 유무 확인
    boolean existsByEmployeeNumber(String employeeNumber);

    // 아이디 유무 확인
    boolean existsByAccountId(String accountId);


}
