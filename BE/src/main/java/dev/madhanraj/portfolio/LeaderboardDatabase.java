package dev.madhanraj.portfolio;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty("games.database.url")
class LeaderboardDatabase {
    @Bean
    HikariDataSource leaderboardDataSource(
            @Value("${games.database.url}") String url,
            @Value("${games.database.username}") String username,
            @Value("${games.database.password}") String password) {
        var config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        config.setMinimumIdle(0);
        config.setMaximumPoolSize(4);
        config.setConnectionTimeout(10_000);
        return new HikariDataSource(config);
    }

    @Bean
    LeaderboardStore leaderboardStore(HikariDataSource leaderboardDataSource) {
        return new LeaderboardStore(JdbcClient.create(leaderboardDataSource));
    }
}
