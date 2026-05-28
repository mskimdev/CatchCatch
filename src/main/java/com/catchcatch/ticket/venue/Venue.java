package com.catchcatch.ticket.venue;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigInteger;
@Entity
@Data
@Table(name="venue_tb")
@NoArgsConstructor
public class Venue {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private Integer totalSeats;

    private String description;


    public Venue(String name, String address, Integer totalSeats, String description) {
        this.name = name;
        this.address = address;
        this.totalSeats = totalSeats;
        this.description = description;
    }
}
