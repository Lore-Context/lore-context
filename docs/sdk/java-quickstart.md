# Java SDK quickstart

The Java client for Lore Context is generated into `packages/sdk-java`.

## Install

Use the Java package coordinates produced by your local publish process (Maven/Gradle):

- Maven Central: `dev.lorecontext:lore-context-sdk`

## Quick start

```java
import com.lore.context.api.LoreContextApiClient;
import com.lore.context.api.core.Environment;

public class Quickstart {
  public static void main(String[] args) {
    LoreContextApiClient client = LoreContextApiClient.builder()
      .environment(Environment.DEFAULT)
      .token("<api-token>")
      .build();

    var health = client.getHealth();
    System.out.println(health);
  }
}
```

## Notes

- Source-of-truth package and generator path: `fern/generators.yml`
- Generation target: `packages/sdk-java`
