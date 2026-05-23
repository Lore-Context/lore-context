# Kotlin example

The Java SDK is Kotlin-friendly through standard Java interop.

```kotlin
import com.lore.context.api.LoreContextApiClient
import com.lore.context.api.core.Environment

fun main() {
  val client = LoreContextApiClient.builder()
    .environment(Environment.DEFAULT)
    .token("<api-token>")
    .build()

  val health = client.getHealth()
  println(health)
}
```
