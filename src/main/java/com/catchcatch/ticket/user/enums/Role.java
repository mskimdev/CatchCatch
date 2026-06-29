package com.catchcatch.ticket.user.enums;

public enum Role {
    ADMIN("ADMIN"),
    MANAGER("ADMIN"),
    CLERK("ADMIN"),
    USER("USER");

    private final String group; // 상위 그룹 (ADMIN, USER)

    Role(String group) {
        this.group = group;
    }

    public String getGroup() {
        return group;
    }

    // 그룹 체크 메서드
    public boolean isCategory(String category) {
        return this.group.equals(category);
    }
}
