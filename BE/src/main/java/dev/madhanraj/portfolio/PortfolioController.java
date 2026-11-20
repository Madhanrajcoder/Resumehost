package dev.madhanraj.portfolio;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class PortfolioController {
    private final JsonNode portfolio;

    public PortfolioController(ObjectMapper mapper) throws IOException {
        try (InputStream source = new ClassPathResource("portfolio.json").getInputStream()) {
            portfolio = mapper.readTree(source);
        }
    }

    @GetMapping("/portfolio")
    public ResponseEntity<JsonNode> portfolio() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(portfolio);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
