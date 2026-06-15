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

        String sql = " INSERT INTO seat_tb " +
                "(session_id,floor,section_name,seat_row,seat_col,seat_number, grade, price, status, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

        jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                Seat seat = seats.get(i);

                ps.setInt(1,seat.getSessionId());
                ps.setInt(2,seat.getFloor());
                ps.setString(3,seat.getSectionName());
                ps.setString(4, seat.getSeatRow());
                ps.setInt(5, seat.getSeatCol());
                ps.setString(6, seat.getSeatNumber());
                ps.setString(7, seat.getGrade().name());
                ps.setInt(8, seat.getPrice());
                ps.setString(9, seat.getStatus().name());
            }

            @Override
            public int getBatchSize() {
                return seats.size();
            }
        });

    }

}
