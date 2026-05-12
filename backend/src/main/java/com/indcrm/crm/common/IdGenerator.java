package com.indcrm.crm.common;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class IdGenerator {
    private static final String ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int RANDOM_SIZE = 5;
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyMMdd");

    public static String nextId() {
        String date = LocalDate.now().format(DATE_FMT);
        StringBuilder sb = new StringBuilder(RANDOM_SIZE);
        for (int i = 0; i < RANDOM_SIZE; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return date + sb;
    }
}
