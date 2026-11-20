FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src src
RUN mvn -B package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/portfolio-api.jar portfolio-api.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-Xmx256m", "-jar", "portfolio-api.jar"]
