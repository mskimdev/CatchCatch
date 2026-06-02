package com.catchcatch.ticket.venue;

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

    @Builder
    public Venue(String name, String address, Integer totalCapacity) {
        this.name = name;
        this.address = address;
        this.totalCapacity = totalCapacity;
    }

    public String getFormattedCreatedAt() {
        if (createdAt == null) {
            return "";
        }

        return new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm").format(createdAt);
    }
}
