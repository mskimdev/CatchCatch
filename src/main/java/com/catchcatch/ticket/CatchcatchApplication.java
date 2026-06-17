package com.catchcatch.ticket;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class CatchcatchApplication {

    public static void main(String[] args) {
        SpringApplication.run(CatchcatchApplication.class, args);
    }

}