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

public class User {
}
