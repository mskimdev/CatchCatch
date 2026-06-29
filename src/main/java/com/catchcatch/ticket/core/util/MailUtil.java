package com.catchcatch.ticket.core.util;

import java.security.SecureRandom;

public class MailUtil {

    private static final SecureRandom random = new SecureRandom();

    public static String generateRandomCode() {
        return String.valueOf(100000 + random.nextInt(900000));
    }
}