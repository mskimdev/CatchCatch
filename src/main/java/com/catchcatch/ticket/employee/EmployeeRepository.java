package com.catchcatch.ticket.employee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Integer> {

    // 사원번호 유무 확인
    boolean existsByEmployeeNumber(String employeeNumber);

    // 이름으로 검색
    List<Employee> findByNameContaining(String name);

    // 사번으로 검색
    Optional<Employee> findByEmployeeNumber(String employeeNumber);

}
