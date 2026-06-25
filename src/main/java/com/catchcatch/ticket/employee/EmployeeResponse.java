package com.catchcatch.ticket.employee;

import com.catchcatch.ticket.user.enums.Role;

public class EmployeeResponse {

    public record ListDTO(
            Integer id,
            String employeeNumber,
            String username,
            String name,
            String department,
            String role,
            String status
    ) {
        public ListDTO(Employee employee) {
            this(
                    employee.getId(),
                    employee.getEmployeeNumber(),
                    employee.getUser().getUsername(),
                    employee.getName(),
                    employee.getDepartment(),
                    employee.getUser().getRole().name(),
                    employee.getStatus().name()
            );
        }
    }

    public record DetailDTO(
            String employeeNumber,
            String name,
            String department,
            Role role
    ) {
        public DetailDTO(Employee employee) {
            this(
                    employee.getEmployeeNumber(),
                    employee.getName(),
                    employee.getDepartment(),
                    employee.getUser().getRole()
            );
        }
    }
}