package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminUserService {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final UserRepository userRepository;

    public List<AdminUserResponse.ListDTO> findAll() {
        return userRepository.findAllByOrderByIdDesc().stream()
                .map(AdminUserResponse.ListDTO::new)
                .toList();
    }

    @Transactional
    public AdminUserResponse.ListDTO update(Integer id, AdminUserRequest.UpdateDTO request) {
        User user = findUser(id);
        validateUpdate(id, request);
        if (user.isDeleted()) {
            throw new BadRequestException("탈퇴 처리된 회원은 수정할 수 없습니다.");
        }

        user.setUsername(request.username().trim());
        user.setEmail(request.email().trim());
        user.setPhone(normalizePhone(request.phone()));
        user.setPoint(request.point());
        return new AdminUserResponse.ListDTO(user);
    }

    @Transactional
    public void delete(Integer id) {
        User user = findUser(id);
        if (user.isAdminGroup()) {
            throw new BadRequestException("관리자 계정은 탈퇴 처리할 수 없습니다.");
        }
        if (user.isDeleted()) {
            throw new BadRequestException("이미 탈퇴 처리된 회원입니다.");
        }
        user.setDeleted(true);
    }

    private User findUser(Integer id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("회원을 찾을 수 없습니다."));
    }

    private void validateUpdate(Integer id, AdminUserRequest.UpdateDTO request) {
        if (request == null || request.username() == null || request.username().isBlank()) {
            throw new BadRequestException("아이디를 입력해주세요.");
        }
        if (request.email() == null || !EMAIL_PATTERN.matcher(request.email().trim()).matches()) {
            throw new BadRequestException("올바른 이메일을 입력해주세요.");
        }
        if (request.point() == null || request.point() < 0) {
            throw new BadRequestException("포인트는 0 이상이어야 합니다.");
        }
        if (userRepository.existsByUsernameAndIdNot(request.username().trim(), id)) {
            throw new BadRequestException("이미 사용 중인 아이디입니다.");
        }
        if (userRepository.existsByEmailAndIdNot(request.email().trim(), id)) {
            throw new BadRequestException("이미 사용 중인 이메일입니다.");
        }
    }

    private String normalizePhone(String phone) {
        return phone == null || phone.isBlank() ? null : phone.trim();
    }
}
