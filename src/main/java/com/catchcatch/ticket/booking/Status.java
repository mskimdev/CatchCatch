package com.catchcatch.ticket.booking;

public enum Status {
    PENDING("결제대기"),
    PAID("예약확정"),
    CANCELED("취소됨"),
    EXPIRED("만료됨");

    private final String label;

    Status(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public boolean isPending() {
        return this == PENDING;
    }

    public boolean isPaid() {
        return this == PAID;
    }

    public boolean isCanceled() {
        return this == CANCELED;
    }
}
