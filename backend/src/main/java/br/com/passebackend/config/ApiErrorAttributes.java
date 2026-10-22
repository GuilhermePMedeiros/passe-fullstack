package br.com.passebackend.config;

import java.util.Map;
import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.boot.web.servlet.error.DefaultErrorAttributes;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.WebRequest;

@Component
public class ApiErrorAttributes extends DefaultErrorAttributes {
    @Override
    public Map<String, Object> getErrorAttributes(WebRequest request, ErrorAttributeOptions options) {
        Map<String, Object> attributes = super.getErrorAttributes(request, options);
        if (((Number) attributes.get("status")).intValue() >= 500) {
            attributes.put("message", "Falha inesperada ao processar a requisição.");
        }
        attributes.remove("trace");
        attributes.remove("exception");
        return attributes;
    }
}
