package com.catchcatch.ticket.user;

/*
    컬럼명	타입	키	NOT NULL	기본값	설명
    id	INT (PK, AI)	PK	Y	AUTO_INCREMENT	사용자 고유 ID
    username	VARCHAR(50)		Y		사용자 로그인 이름 (UNIQUE)
    password	VARCHAR(255)		Y		BCrypt 암호화 비밀번호
    email	VARCHAR(100)		Y		이메일 주소 (UNIQUE)
    phone	VARCHAR(20)		N	NULL	전화번호
    profile_image	VARCHAR(255)		N	NULL	프로필 이미지 파일명 또는 URL
    oauth_provider	VARCHAR(20)		Y	LOCAL	LOCAL / KAKAO / GOOGLE / NAVER
    created_at	TIMESTAMP		Y	CURRENT_TIMESTAMP	가입 일시

 */


import com.catchcatch.ticket.user.dto.UserRequest;
import com.catchcatch.ticket.user.enums.OAuthProvider;
import com.catchcatch.ticket.user.enums.Role;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CurrentTimestamp;

import java.sql.Timestamp;

@Data
@NoArgsConstructor
@Table(name = "user_tb")
@Entity
public class User {

    // 사용자 고유 ID
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 사용자 로그인 이름 (UNIQUE)
    @Column(unique = true)
    private String username;

    // BCrypt 암호화 비밀번호
    private String password;

    // 이메일 주소 (UNIQUE)
    @Column(unique = true)
    private String email;

    // 전화번호
    private String phone;

    // 유저 포인트
    @Column(nullable = false)
    private Integer point = 0;

    // 프로필 이미지 파일명 또는 URL
    private String profileImage;

    // LOCAL	LOCAL / KAKAO / GOOGLE / NAVER
    @Enumerated(EnumType.STRING)
    @ColumnDefault("'LOCAL'")
    private OAuthProvider oauthProvider;

    @Column(unique = true)
    private String oauthId;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'USER'")
    private Role role;

    // 가입 일시
    @CurrentTimestamp
    private Timestamp createdAt;

    @ColumnDefault("false")
    private boolean isDeleted;

    public boolean hasAdminAccess() {
        return Role.ADMIN.equals(this.role) ||
                Role.MANAGER.equals(this.role) ||
                Role.CLERK.equals(this.role);
    }

    @Builder
    public User(String username, String password, String email,
                String phone, String profileImage,
                OAuthProvider oauthProvider, String oauthId, Role role) {
        this.username = username;
        this.password = password;
        this.email = email;
        this.phone = phone;
        this.profileImage = profileImage;
        this.oauthProvider = oauthProvider;
        this.oauthId = oauthId;
        this.role = role;
    }



    // 포인트 적립
    public void addPoint(Integer amount) {
        if (amount == null || amount <= 0) {
            throw new RuntimeException("적립 포인트가 올바르지 않습니다.");
        }

        if (this.point == null) {
            this.point = 0;
        }

        this.point += amount;
    }

    // 포인트 사용
    public void usePoint(Integer amount) {
        if (amount == null || amount <= 0) {
            throw new RuntimeException("사용 포인트가 올바르지 않습니다.");
        }

        if (this.point == null) {
            this.point = 0;
        }

        if (this.point < amount) {
            throw new RuntimeException("보유 포인트가 부족합니다.");
        }

        this.point -= amount;
    }


}
