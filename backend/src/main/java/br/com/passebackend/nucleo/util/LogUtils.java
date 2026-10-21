package br.com.passebackend.nucleo.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class LogUtils {
    private static final Logger LOGGER = LoggerFactory.getLogger(LogUtils.class);

    private LogUtils() { }

    public static void request(String method, String path, int status) {
        LOGGER.info("{} {} {} {}", DateTimeUtils.format(DateTimeUtils.now()),
                singleLine(method), singleLine(path), status);
    }

    private static String singleLine(String value) {
        return value.replaceAll("[\\p{Cntrl}\\u2028\\u2029]", "_");
    }
}
