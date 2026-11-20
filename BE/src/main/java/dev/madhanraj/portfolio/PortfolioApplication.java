package dev.madhanraj.portfolio;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)
public class PortfolioApplication {
    public static void main(String[] args) {
        SpringApplication.run(PortfolioApplication.class, args);
    }

    @Bean
    WebMvcConfigurer portfolioCors(@Value("${portfolio.frontend-origin}") String frontendOrigin) {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/portfolio")
                        .allowedOrigins(frontendOrigin)
                        .allowedMethods("GET");
                registry.addMapping("/api/games/**")
                        .allowedOrigins(frontendOrigin)
                        .allowedMethods("GET", "PUT")
                        .allowedHeaders("Authorization", "Content-Type");
            }
        };
    }
}
