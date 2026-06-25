# Estágio de build
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Estágio de execução com JRE mais leve (alpine)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/api-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

# Flags JVM otimizadas para:
# - Início rápido (-XX:TieredStopAtLevel=1)
# - Baixo consumo de memória em containers pequenos (-XX:+UseSerialGC, -XX:MaxRAMPercentage=75.0)
ENTRYPOINT ["java", "-XX:TieredStopAtLevel=1", "-XX:+UseSerialGC", "-Xss512k", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
