package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.employee.Employee;
import com.catchcatch.ticket.employee.EmployeeRepository;
import com.catchcatch.ticket.employee.EmployeeRequest;
import com.catchcatch.ticket.employee.EmployeeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminEmployeeService {

    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    // 전체 사원 조회
    @Transactional(readOnly = true)
    public List<EmployeeResponse.ListDTO> getAllEmployees() {
        return employeeRepository.findAll().stream()
                .map(EmployeeResponse.ListDTO::new)
                .collect(Collectors.toList());
    }


    // 신규 사원 추가
    @Transactional
    public void createEmployee(EmployeeRequest.CreateDTO reqDTO) {
        // 1. 사번 중복 체크 (추가됨)
        if (employeeRepository.existsByEmployeeNumber(reqDTO.employeeNumber())) {
            throw new BadRequestException("이미 등록된 사번입니다.");
        }

        // 2. 아이디 중복 체크
        if (employeeRepository.existsByAccountId(reqDTO.accountId())) {
            throw new BadRequestException("이미 사용 중인 아이디입니다.");
        }

        // 3. 엔티티 생성 및 저장
        Employee employee = Employee.builder()
                .employeeNumber(reqDTO.employeeNumber())
                .accountId(reqDTO.accountId())
                .password(passwordEncoder.encode(reqDTO.password()))
                .name(reqDTO.name())
                .department(reqDTO.department())
                .role(reqDTO.role())
                .build();

        employeeRepository.save(employee);
    }
}
