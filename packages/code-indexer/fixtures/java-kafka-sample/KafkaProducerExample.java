/**
 * KafkaProducerExample.java
 * Hand-curated Kafka producer fixture for Lane M Tier-2 Java recall testing.
 * Simulates a real Kafka producer pattern from the Apache Kafka codebase.
 */

package org.apache.kafka.examples;

import org.apache.kafka.clients.producer.Callback;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;

/**
 * A simple Kafka producer that sends messages to a topic.
 */
public class KafkaProducerExample implements Runnable, AutoCloseable {

    private final String topic;
    private final boolean isAsync;
    private final KafkaProducer<String, String> producer;
    private final CountDownLatch latch;

    /**
     * Constructs a KafkaProducerExample.
     *
     * @param brokers   bootstrap server address
     * @param topic     target Kafka topic
     * @param isAsync   whether to send asynchronously
     * @param latch     countdown latch for synchronization
     */
    public KafkaProducerExample(String brokers, String topic, boolean isAsync, CountDownLatch latch) {
        this.topic = topic;
        this.isAsync = isAsync;
        this.latch = latch;
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, brokers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        this.producer = new KafkaProducer<>(props);
    }

    @Override
    public void run() {
        int messagesSent = 0;
        while (messagesSent < 100 && !Thread.currentThread().isInterrupted()) {
            String key = "key-" + messagesSent;
            String value = "message-" + messagesSent;
            ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);
            if (isAsync) {
                producer.send(record, new DemoCallback(key, value));
            } else {
                try {
                    producer.send(record).get();
                } catch (InterruptedException | ExecutionException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
            messagesSent++;
        }
        latch.countDown();
    }

    @Override
    public void close() {
        producer.close();
    }
}

/**
 * Callback implementation for async producer sends.
 */
class DemoCallback implements Callback {

    private final String key;
    private final String value;

    public DemoCallback(String key, String value) {
        this.key = key;
        this.value = value;
    }

    @Override
    public void onCompletion(RecordMetadata metadata, Exception exception) {
        if (exception != null) {
            System.err.println("Send failed for key=" + key + ": " + exception.getMessage());
        } else {
            System.out.printf("Sent key=%s value=%s to topic=%s partition=%d offset=%d%n",
                key, value, metadata.topic(), metadata.partition(), metadata.offset());
        }
    }
}
