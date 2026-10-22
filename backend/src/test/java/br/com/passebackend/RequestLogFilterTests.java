package br.com.passebackend;

import java.util.stream.Stream;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.ServletException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import br.com.passebackend.config.RequestLogFilter;
import br.com.passebackend.nucleo.util.LogUtils;

import static org.assertj.core.api.Assertions.*;

@ExtendWith(OutputCaptureExtension.class)
class RequestLogFilterTests {
    private final RequestLogFilter filter = new RequestLogFilter();

    @ParameterizedTest
    @ValueSource(ints = {200, 201, 204, 400, 404, 409, 500})
    void logsFinalStatusOnceWithoutBodyOrQuery(int status, CapturedOutput output) throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/v1/players");
        request.setQueryString("token=secret");
        request.setContent("private-body".getBytes());
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, (req, res) -> response.setStatus(status));

        var lines = requestLines(output).toList();
        assertThat(lines).hasSize(1);
        assertThat(lines.getFirst()).containsPattern(
                "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}-03:00 POST /api/v1/players " + status + "$");
        assertThat(output.getOut()).doesNotContain("secret", "private-body");
        assertThat(response.getStatus()).isEqualTo(status);
    }

    @Test
    void logsUnhandledFailureAs500AndPreservesException(CapturedOutput output) {
        var failure = new ServletException("original failure");
        assertThatThrownBy(() -> filter.doFilter(new MockHttpServletRequest("GET", "/api/v1/clubs"),
                new MockHttpServletResponse(), (req, res) -> { throw failure; })).isSameAs(failure);
        assertThat(requestLines(output).toList()).singleElement()
                .asString().endsWith("GET /api/v1/clubs 500");
    }

    @Test
    void doesNotDuplicateLogOnErrorDispatch(CapturedOutput output) throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/v1/missing");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> response.sendError(404));
        request.setDispatcherType(DispatcherType.ERROR);
        request.setRequestURI("/error");
        filter.doFilter(request, response, (req, res) -> { });
        assertThat(requestLines(output).toList()).singleElement()
                .asString().endsWith("GET /api/v1/missing 404");
    }

    @Test
    void preventsInjectedLogLines(CapturedOutput output) {
        LogUtils.request("GET", "/api/v1/test\r\nforged\u2028line", 400);
        assertThat(requestLines(output).toList()).singleElement()
                .asString().endsWith("GET /api/v1/test__forged_line 400");
    }

    private Stream<String> requestLines(CapturedOutput output) {
        return output.getOut().lines().filter(line -> line.contains("LogUtils"));
    }
}
