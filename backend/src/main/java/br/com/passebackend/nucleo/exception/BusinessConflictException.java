package br.com.passebackend.nucleo.exception;

public class BusinessConflictException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public BusinessConflictException(String message) {
        super(message);
    }

    public BusinessConflictException(String message, Throwable cause) {
        super(message, cause);
    }

}