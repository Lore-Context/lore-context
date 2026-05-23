import com.lore.context.api.LoreContextApiClient
import com.lore.context.api.core.Environment

fun main() {
  val client = LoreContextApiClient.builder()
    .environment(Environment.DEFAULT)
    .token("<api-token>")
    .build()

  println(client.getHealth())
}
