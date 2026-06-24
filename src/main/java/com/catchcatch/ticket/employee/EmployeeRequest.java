package com.catchcatch.ticket.employee;

import com.catchcatch.ticket.user.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

public class EmployeeRequest {

    public record CreateDTO(
            @NotBlank(message = "사번을 입력해주세요.") String employeeNumber,
            @NotBlank(message = "아이디를 입력해주세요.") String accountId,
            @NotBlank(message = "비밀번호를 입력해주세요.") String password,
            @NotBlank(message = "이름을 입력해주세요.") String name,
            @NotBlank(message = "부서를 입력해주세요.") String department,
            @NotNull(message = "권한을 선택해주세요.") Role role
    ) {
    }

    @Builder
    public record UpdateDTO(
            @NotBlank(message = "이름을 입력해주세요.")
            String name,

            @NotBlank(message = "부서를 입력해주세요.")
            String department,

            @NotNull(message = "권한을 선택해주세요.")
            Role role
    ) {

    }
}
