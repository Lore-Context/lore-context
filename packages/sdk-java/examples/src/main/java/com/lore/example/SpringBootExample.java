import com.lore.context.api.LoreContextApiClient;
import com.lore.context.api.core.Environment;

public class SpringBootExample {
  public static void main(String[] args) {
    LoreContextApiClient client = LoreContextApiClient.builder()
      .environment(Environment.DEFAULT)
      .token("<api-token>")
      .build();

    System.out.println(client.getHealth());
  }
}
