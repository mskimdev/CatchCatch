package com.catchcatch.ticket.employee;

import com.catchcatch.ticket.user.User; // User 엔티티 임포트
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp; // updatedAt에 더 적합

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

    @Column(nullable = false)
    private String department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmployeeStatus status;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @CreationTimestamp
    private Timestamp createdAt;

    @UpdateTimestamp
    private Timestamp updatedAt;

    @Builder
    public Employee(String employeeNumber, String name, String department, User user) {
        this.employeeNumber = employeeNumber;
        this.name = name;
        this.department = department;
        this.user = user;
        this.status = EmployeeStatus.ACTIVE;
    }

    // 상태 변경 메서드 (계정 정지 등)
    public void changeStatus(EmployeeStatus status) {
        this.status = status;
    }

    // 정보 수정 메서드
    public void update(String name, String department) {
        this.name = name;
        this.department = department;
    }
}