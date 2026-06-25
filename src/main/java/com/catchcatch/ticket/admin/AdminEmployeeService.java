package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.ForbiddenException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.core.exception.UnauthorizedException;
import com.catchcatch.ticket.employee.*;
import com.catchcatch.ticket.user.enums.Role;
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
    public List<EmployeeResponse.ListDTO> findAllEmployees() {
        return employeeRepository.findAll().stream()
                .map(EmployeeResponse.ListDTO::new)
                .collect(Collectors.toList());
    }

    // 특정 사원 조회
    @Transactional(readOnly = true)
    public List<EmployeeResponse.ListDTO> findEmployees(String type, String keyword) {
        // 검색어 없을 시 전체 반환
        if (keyword == null || keyword.trim().isBlank()) {
            return findAllEmployees();
        }

        // 검색 타입이 이름일 때
        if ("name".equals(type)) {
            return employeeRepository.findByNameContaining(keyword).stream()
                    .map(EmployeeResponse.ListDTO::new).collect(Collectors.toList());
        }

        // 검색 타입이 사번일 때
        if ("empNo".equals(type)) {
            return employeeRepository.findByEmployeeNumber(keyword)
                    .map(EmployeeResponse.ListDTO::new).stream().collect(Collectors.toList());
        }

        // 타입이 안맞으면 빈 리스트나 전체 리스트 반환
        return List.of();

    }

    // 사원 정보 수정
    @Transactional
    public EmployeeResponse.DetailDTO updateEmployeeInfo(String employeeNumber, EmployeeRequest.UpdateDTO reqDTO, Role userRole) {
        // 권한 확인
        checkAuthorization(userRole);

        Employee employee = employeeRepository.findByEmployeeNumber(employeeNumber)
                .orElseThrow(() -> new NotFoundException("사원번호와 일치하는 사원이 없습니다."));

        employee.update(reqDTO.name(), reqDTO.department(), reqDTO.role());

        return new EmployeeResponse.DetailDTO(employee);
    }


    // 사원 계정 정지 및 퇴사처리
    // 1. 사원 조회
    @Transactional
    public void updateEmployeeStatus(String employeeNumber, EmployeeStatus status, Role userRole) {
        // 권한 확인
        checkAuthorization(userRole);

        Employee employee = employeeRepository.findByEmployeeNumber(employeeNumber)
                .orElseThrow(() -> new NotFoundException("사원번호와 일치하는 사원이 없습니다."));

        // 2. 상태 변경 (더티 체킹 발동 -> 자동 UPDATE 쿼리 실행)
        employee.changeStatus(status);
    }

    // 직원 활동 로그 조회

    // 신규 사원 추가
    @Transactional
    public void createEmployee(EmployeeRequest.CreateDTO reqDTO, Role userRole) {
        // 권한 확인
        checkAuthorization(userRole);

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


    public void checkAuthorization(Role userRole) {
        if (userRole != Role.ADMIN) {
            throw new UnauthorizedException("해당 권한을 가지고 있지 않습니다.");
        }
    }
}
