dependencies {
    api(project(":zappy-domain"))
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core")

    testImplementation(testFixtures(project(":zappy-domain")))
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test")
}
