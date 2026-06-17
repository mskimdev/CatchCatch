package com.catchcatch.ticket.venue;

import com.catchcatch.ticket.core.util.DateUtil;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;


@Entity
@Data
@Table(name = "venue_tb")
@NoArgsConstructor
public class Venue {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private Integer totalCapacity;

    @CreationTimestamp
    private Timestamp createdAt;

    // JSON 경로 저장
    @Column(name = "seat_map_file_path")
    private String seatMapFilePath;

    @Builder
    public Venue(String name, String address, Integer totalCapacity) {
        this.name = name;
        this.address = address;
        this.totalCapacity = totalCapacity;
    }

    public String getFormattedCreatedAt() {

        return DateUtil.formatDateTime(createdAt);
    }

    public void update(String name, String address, Integer totalCapacity) {
        this.name = name;
        this.address = address;
        this.totalCapacity = totalCapacity;
    }
}
