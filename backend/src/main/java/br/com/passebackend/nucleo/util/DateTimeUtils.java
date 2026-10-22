package br.com.passebackend.nucleo.util;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;

public final class DateTimeUtils {
    private static final ZoneOffset BRASILIA = ZoneOffset.ofHours(-3);
    private static final DateTimeFormatter INPUT = DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mmXXX")
            .withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter OUTPUT = DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ssXXX");

    private DateTimeUtils() { }

    public static LocalDateTime now() {
        return LocalDateTime.now(BRASILIA);
    }

    public static LocalDateTime parseLoyalty(String text) {
        if (text == null || !text.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}-03:00")) {
            throw new IllegalArgumentException("Data deve usar AAAA-MM-DDTHH:MM-03:00.");
        }
        try {
            return LocalDateTime.parse(text, INPUT);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("Data ou hora inválida.");
        }
    }

    public static String format(LocalDateTime time) {
        return time.atOffset(BRASILIA).format(OUTPUT);
    }
}
