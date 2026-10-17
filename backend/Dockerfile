FROM eclipse-temurin:21-jdk-jammy AS dependencies
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN sh ./mvnw -B -ntp dependency:go-offline

FROM dependencies AS source
COPY src src

FROM source AS tests
CMD ["sh", "./mvnw", "-B", "-ntp", "verify"]

FROM source AS package
RUN sh ./mvnw -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app
COPY --from=package /app/target/passe-backend-0.0.1-SNAPSHOT.jar app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
