package com.catchcatch.ticket.employee;

public class EmployeeResponse {

    public record ListDTO(
            Integer id,
            String employeeNumber, // 🚨 추가됨
            String accountId,
            String name,
            String department,
            String role,
            String status
    ) {
        public ListDTO(Employee employee) {
            this(
                    employee.getId(),
                    employee.getEmployeeNumber(),
                    employee.getAccountId(),
                    employee.getName(),
                    employee.getDepartment(),
                    employee.getRole().toString(),
                    employee.getStatus().name()
            );
        }
    }
}
