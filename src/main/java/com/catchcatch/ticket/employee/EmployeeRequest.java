package com.catchcatch.ticket.employee;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class EmployeeRequest {

    public record CreateDTO(
            @NotBlank(message = "사번을 입력해주세요.") String employeeNumber, // 🚨 추가됨
            @NotBlank(message = "아이디를 입력해주세요.") String accountId,
            @NotBlank(message = "비밀번호를 입력해주세요.") String password,
            @NotBlank(message = "이름을 입력해주세요.") String name,
            @NotBlank(message = "부서를 입력해주세요.") String department,
            @NotNull(message = "권한을 선택해주세요.") EmployeeRole role
    ) {}
}
