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
                "(floor, price, seat_col, session_id, updated_at, seat_row, seat_number, section_name, grade, status) " +
                "VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)";

        jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                Seat seat = seats.get(i);

                ps.setInt(1, seat.getFloor());
                ps.setInt(2, seat.getPrice());
                ps.setInt(3, seat.getSeatCol());
                ps.setInt(4, seat.getSessionId());
                ps.setString(5, seat.getSeatRow());
                ps.setString(6, seat.getSeatNumber());
                ps.setString(7, seat.getSectionName());
                ps.setString(8, seat.getGrade().name());
                ps.setString(9, seat.getStatus().name());
            }

            @Override
            public int getBatchSize() {
                return seats.size();
            }
        });
    }

}
