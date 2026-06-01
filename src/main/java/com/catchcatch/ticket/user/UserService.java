package com.catchcatch.ticket.user;

import com.catchcatch.ticket.core.errors.BadRequestException;
import com.catchcatch.ticket.user.dto.UserRequest;
import com.catchcatch.ticket.user.enums.OauthProvider;
import com.catchcatch.ticket.user.enums.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@RequiredArgsConstructor
@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void join(UserRequest.JoinDTO req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new BadRequestException("이미 사용 중인 아이디입니다.");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("이미 사용 중인 이메일입니다.");
        }


        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .phone(req.getPhone())
                .oauthProvider(OauthProvider.LOCAL)
                .role(Role.USER)
                .build();

        userRepository.save(user);
    }

    public User login(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("아이디 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BadRequestException("아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        return user;
    }

    @Transactional
    public User updateProfile(Integer userId, UserRequest.ProfileUpdateDTO req, String profileImageUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("회원 정보를 찾을 수 없습니다."));

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("현재 비밀번호가 올바르지 않습니다.");
        }
        if (!user.getUsername().equals(req.getUsername()) && userRepository.existsByUsername(req.getUsername())) {
            throw new BadRequestException("이미 사용 중인 아이디입니다.");
        }

        user.setUsername(req.getUsername());
        user.setPhone(req.getPhone());
        if (profileImageUrl != null) {
            user.setProfileImage(profileImageUrl);
        }
        if (req.getNewPassword() != null && !req.getNewPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        }

        return user;
    }
}
