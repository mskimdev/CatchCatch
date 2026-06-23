package com.catchcatch.ticket.seat;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class SeatJdbcRepository {

    private final JdbcTemplate jdbcTemplate;

    public void batchInsertSeats(List<Seat> seats) {
        String sql = "INSERT INTO seat_tb " +
                "(floor, price, seat_angle, seat_col, seat_size, session_id, x_label, y_label, updated_at, seat_row, seat_number, section_name, grade, status) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)";

        jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                Seat seat = seats.get(i);

                // 💡 2. SQL 문의 '?' 순서(총 13개)에 맞춰 값 맵핑
                ps.setInt(1, seat.getFloor());          // 1. floor
                ps.setInt(2, seat.getPrice());          // 2. price
                ps.setDouble(3, seat.getSeatAngle());   // 3. seat_angle (FLOAT)
                ps.setInt(4, seat.getSeatCol());        // 4. seat_col
                ps.setDouble(5, seat.getSeatSize());    // 5. seat_size (FLOAT)
                ps.setInt(6, seat.getSessionId());      // 6. session_id
                ps.setDouble(7, seat.getXLabel());      // 7. x_label (FLOAT)
                ps.setDouble(8, seat.getYLabel());      // 8. y_label (FLOAT)

                // (updated_at은 NOW()로 처리되므로 건너뜀)

                ps.setString(9, seat.getSeatRow());     // 9. seat_row
                ps.setString(10, seat.getSeatNumber()); // 10. seat_number
                ps.setString(11, seat.getSectionName());// 11. section_name
                ps.setString(12, seat.getGrade().name()); // 12. grade (ENUM)
                ps.setString(13, seat.getStatus().name());// 13. status (ENUM)
            }

            @Override
            public int getBatchSize() {
                return seats.size();
            }
        });
    }

}
