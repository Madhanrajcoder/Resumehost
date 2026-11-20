package dev.madhanraj.portfolio;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.autoconfigure.flyway.FlywayConfigurationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.util.StringUtils;

@Configuration(proxyBeanMethods = false)
@Conditional(LeaderboardDatabase.Configured.class)
class LeaderboardDatabase {
    private static final String JDBC_URL = "games.database.url";
    private static final String NEON_URL = "DATABASE_URL";
    private static final String NEON_DIRECT_URL = "DATABASE_URL_UNPOOLED";

    @Bean
    HikariDataSource leaderboardDataSource(Environment environment) {
        String jdbcUrl = environment.getProperty(JDBC_URL);
        Connection connection = StringUtils.hasText(jdbcUrl)
                ? new Connection(jdbcUrl, environment.getRequiredProperty("games.database.username"),
                        environment.getRequiredProperty("games.database.password"))
                : fromPostgresUri(environment.getRequiredProperty(NEON_URL), false);
        var config = new HikariConfig();
        config.setJdbcUrl(connection.jdbcUrl());
        config.setUsername(connection.username());
        config.setPassword(connection.password());
        config.setMinimumIdle(0);
        config.setMaximumPoolSize(4);
        config.setConnectionTimeout(10_000);
        return new HikariDataSource(config);
    }

    @Bean
    FlywayConfigurationCustomizer leaderboardFlywayConnection(Environment environment) {
        return flyway -> {
            if (StringUtils.hasText(environment.getProperty(JDBC_URL))) return;
            String directUri = environment.getProperty(NEON_DIRECT_URL);
            String uri = StringUtils.hasText(directUri) ? directUri : environment.getRequiredProperty(NEON_URL);
            Connection direct = fromPostgresUri(uri, true);
            flyway.dataSource(direct.jdbcUrl(), direct.username(), direct.password());
        };
    }

    @Bean
    LeaderboardStore leaderboardStore(HikariDataSource leaderboardDataSource) {
        return new LeaderboardStore(JdbcClient.create(leaderboardDataSource));
    }

    private static Connection fromPostgresUri(String value, boolean direct) {
        URI uri;
        try {
            uri = URI.create(value);
        } catch (IllegalArgumentException exception) {
            throw invalidUri();
        }
        String host = uri.getHost();
        String database = uri.getRawPath();
        String userInfo = uri.getRawUserInfo();
        if (!("postgresql".equals(uri.getScheme()) || "postgres".equals(uri.getScheme()))
                || host == null || !StringUtils.hasText(database) || database.length() < 2 || userInfo == null) {
            throw invalidUri();
        }
        String[] credentials = userInfo.split(":", 2);
        if (credentials.length != 2 || credentials[0].isEmpty() || credentials[1].isEmpty()) {
            throw invalidUri();
        }
        if (direct && host.endsWith(".neon.tech")) host = host.replaceFirst("-pooler\\.", ".");
        String port = uri.getPort() == -1 ? "" : ":" + uri.getPort();
        String jdbc = "jdbc:postgresql://" + host + port + database
                + "?sslmode=verify-full&sslfactory=org.postgresql.ssl.DefaultJavaSSLFactory";
        String query = uri.getRawQuery();
        if (query != null && Arrays.asList(query.split("&")).contains("channel_binding=require")) {
            jdbc += "&channelBinding=require";
        }
        return new Connection(jdbc, decode(credentials[0]), decode(credentials[1]));
    }

    private static String decode(String value) {
        return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
    }

    private static IllegalStateException invalidUri() {
        return new IllegalStateException("Expected a PostgreSQL connection URI with a host, database, username and password.");
    }

    private record Connection(String jdbcUrl, String username, String password) {}

    static final class Configured implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            Environment environment = context.getEnvironment();
            return StringUtils.hasText(environment.getProperty(JDBC_URL))
                    || StringUtils.hasText(environment.getProperty(NEON_URL));
        }
    }
}
