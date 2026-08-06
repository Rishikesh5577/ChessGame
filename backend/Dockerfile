# Render / production image for ChessBet Spring Boot API
# Root Directory on Render must be: backend

FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src src

RUN chmod +x gradlew \
    && ./gradlew bootJar -x test --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=build /app/build/libs/app.jar app.jar

EXPOSE 8000
ENTRYPOINT ["java", "-jar", "app.jar"]
