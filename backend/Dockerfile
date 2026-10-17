FROM maven:3.10.0-eclipse-temurin-21-noble AS dependencies
WORKDIR /app
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline

FROM dependencies AS source
COPY src src

FROM source AS tests
CMD ["mvn", "-B", "-ntp", "verify"]

FROM source AS package
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app
COPY --from=package /app/target/passe-backend-0.0.1-SNAPSHOT.jar app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
