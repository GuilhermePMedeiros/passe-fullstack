package br.com.passebackend;

final class TestDatabaseSettings {
    private TestDatabaseSettings() { }

    static String url(String url) {
        if (url == null || !url.matches("jdbc:mysql://[a-zA-Z0-9_.-]+:[0-9]+/passedb_test(?:\\?[^;#]*)?")) {
            throw new IllegalArgumentException("Os testes exigem TEST_DB_URL com o banco exclusivo passedb_test.");
        }
        return url;
    }
}
