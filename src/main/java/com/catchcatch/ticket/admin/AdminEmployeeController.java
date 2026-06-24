package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.employee.EmployeeRequest;
import com.catchcatch.ticket.employee.EmployeeStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/employees")
public class AdminEmployeeController {

    private final AdminEmployeeService adminEmployeeService;

    // 1. 사원 목록 및 검색
    @GetMapping
    public String employeeList(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String keyword,
            Model model) {

        model.addAttribute("employees", adminEmployeeService.findEmployees(type, keyword));
        return "admin/employee/list"; // (사원 목록 html 경로)
    }

    // 2. 신규 사원 등록 처리
    @PostMapping("/create")
    public String createEmployee(@ModelAttribute EmployeeRequest.CreateDTO reqDTO) {
        adminEmployeeService.createEmployee(reqDTO);
        return "redirect:/admin/employees";
    }

    // 3. 사원 정보 수정 처리
    @PostMapping("/{employeeNumber}/update")
    public String updateEmployee(
            @PathVariable String employeeNumber,
            @ModelAttribute EmployeeRequest.UpdateDTO reqDTO) {

        adminEmployeeService.updateEmployeeInfo(employeeNumber, reqDTO);
        return "redirect:/admin/employees";
    }

    // 4. 사원 상태 변경 (정지/퇴사) 처리
    @PostMapping("/{employeeNumber}/status")
    public String changeEmployeeStatus(
            @PathVariable String employeeNumber,
            @RequestParam EmployeeStatus status) {

        adminEmployeeService.updateEmployeeStatus(employeeNumber, status);
        return "redirect:/admin/employees";
    }
}