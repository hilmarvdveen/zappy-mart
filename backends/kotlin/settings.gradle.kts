pluginManagement {
    repositories {
        mavenCentral()
        gradlePluginPortal()
    }
}

rootProject.name = "zappy-mart-kotlin"

include("zappy-domain")
include("zappy-application")
include("zappy-adapters")
include("zappy-host")
