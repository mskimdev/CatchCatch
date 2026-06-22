package com.catchcatch.ticket.employee;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@NoArgsConstructor
@Getter
@Table(name = "employee_tb")
@Entity
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 50)
    private String employeeNumber;

    @Column(nullable = false, length = 20)
    private String name;

    @Column(nullable = false, unique = true, length = 50)
    private String accountId;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmployeeRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmployeeStatus status;

    @CreationTimestamp
    private Timestamp createdAt;

    @CreationTimestamp
    private Timestamp updatedAt;

    @Builder
    public Employee(String employeeNumber, String accountId, String password, String name, String department, EmployeeRole role) {
        this.employeeNumber = employeeNumber;
        this.accountId = accountId;
        this.password = password;
        this.name = name;
        this.department = department;
        this.role = role;
        this.status = EmployeeStatus.ACTIVE; // 생성 시 기본값은 활성 상태
    }

    // 상태 변경 메서드 (계정 정지 등)
    public void changeStatus(EmployeeStatus status) {
        this.status = status;
    }

    // 정보 수정 메서드
    public void updateInfo(String department, EmployeeRole role) {
        this.department = department;
        this.role = role;
    }
}
