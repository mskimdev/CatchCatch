package com.catchcatch.ticket.seat;

/**
 * - AVAILABLE : 사용가능
 * - HELD : 예약중
 * - SOLD : 판매됨
 */
public enum SeatStatus {
    AVAILABLE, // 사용 가능
    HELD,      // 임시 점유(결제 대기)
    SOLD,      // 결제 완료
    OBSTRUCTED // 사용 불가
}
