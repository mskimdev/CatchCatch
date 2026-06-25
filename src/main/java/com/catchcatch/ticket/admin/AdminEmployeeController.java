package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.employee.EmployeeRequest;
import com.catchcatch.ticket.employee.EmployeeStatus;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.validation.Valid;
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
    public String createEmployee(
            @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser,
            @Valid @ModelAttribute EmployeeRequest.CreateDTO reqDTO) {
        adminEmployeeService.createEmployee(reqDTO, sessionUser.getRole());
        return "redirect:/admin/employees";
    }

    // 3. 사원 정보 수정 처리
    @PostMapping("/{employeeNumber}/update")
    public String updateEmployee(
            @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser,
            @PathVariable String employeeNumber,
            @Valid @ModelAttribute EmployeeRequest.UpdateDTO reqDTO) {

        adminEmployeeService.updateEmployeeInfo(employeeNumber, reqDTO, sessionUser.getRole());
        return "redirect:/admin/employees";
    }

    // 4. 사원 상태 변경 (정지/퇴사) 처리
    @PostMapping("/{employeeNumber}/status")
    public String changeEmployeeStatus(
            @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser,
            @PathVariable String employeeNumber,
            @RequestParam EmployeeStatus status) {

        adminEmployeeService.updateEmployeeStatus(employeeNumber, status, sessionUser.getRole());
        return "redirect:/admin/employees";
    }
}