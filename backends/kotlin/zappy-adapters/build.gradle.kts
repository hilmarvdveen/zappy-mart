plugins {
    kotlin("plugin.spring")
    kotlin("plugin.jpa")
}

val contractDirectory = rootProject.layout.projectDirectory.dir("../../contract")

val copyContract by tasks.registering(Copy::class) {
    into(layout.buildDirectory.dir("generated/contract"))
    from(contractDirectory.file("schema.graphql")) {
        into("graphql")
        rename { "schema.graphqls" }
    }
    from(contractDirectory.file("schema.development.graphql")) {
        into("graphql-development")
        rename { "development.graphqls" }
    }
    from(contractDirectory.dir("seed")) {
        into("contract-seed")
        include("*.json")
    }
}

sourceSets.named("main") {
    resources.srcDir(copyContract)
}

dependencies {
    api(project(":zappy-application"))

    api("org.springframework.boot:spring-boot-starter-web")
    api("org.springframework.boot:spring-boot-starter-graphql")
    api("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.security:spring-security-crypto")
    implementation("org.springframework.security:spring-security-oauth2-jose")
    implementation("org.bouncycastle:bcprov-jdk18on:1.85.2")
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor")

    runtimeOnly("com.h2database:h2")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation(testFixtures(project(":zappy-domain")))
}
