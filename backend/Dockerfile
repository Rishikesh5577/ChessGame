# Production image for the ChessBet Spring Boot API.
# Root Directory on Render / build context must be: backend

FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src src

RUN chmod +x gradlew \
    && ./gradlew bootJar -x test --no-daemon

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Stockfish powers games against the computer. Swap in a newer official binary from
# https://github.com/official-stockfish/Stockfish/releases for maximum strength.
RUN apt-get update \
    && apt-get install -y --no-install-recommends stockfish \
    && rm -rf /var/lib/apt/lists/*

ENV APP_BOT_ENGINE_PATH=/usr/games/stockfish

RUN groupadd --system spring && useradd --system --gid spring spring
USER spring:spring

COPY --from=build /app/build/libs/app.jar app.jar

EXPOSE 8000
ENTRYPOINT ["java", "-jar", "app.jar"]
