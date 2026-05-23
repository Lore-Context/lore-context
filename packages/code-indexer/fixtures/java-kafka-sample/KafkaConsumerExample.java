/**
 * KafkaConsumerExample.java
 * Hand-curated Kafka consumer fixture for Lane M Tier-2 Java recall testing.
 */

package org.apache.kafka.examples;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.errors.WakeupException;
import org.apache.kafka.common.serialization.StringDeserializer;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;
import java.util.concurrent.CountDownLatch;

/**
 * A simple Kafka consumer that reads messages from a topic.
 */
public class KafkaConsumerExample implements Runnable, AutoCloseable {

    private final String topic;
    private final KafkaConsumer<String, String> consumer;
    private final CountDownLatch latch;
    private volatile boolean closed = false;

    public KafkaConsumerExample(String brokers, String groupId, String topic, CountDownLatch latch) {
        this.topic = topic;
        this.latch = latch;
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, brokers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        this.consumer = new KafkaConsumer<>(props);
    }

    @Override
    public void run() {
        try {
            consumer.subscribe(Collections.singletonList(topic));
            while (!closed) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
                for (ConsumerRecord<String, String> record : records) {
                    processRecord(record);
                }
            }
        } catch (WakeupException e) {
            if (!closed) throw e;
        } finally {
            consumer.close();
            latch.countDown();
        }
    }

    /**
     * Process a single consumer record.
     * @param record the record to process
     */
    protected void processRecord(ConsumerRecord<String, String> record) {
        System.out.printf("Received key=%s value=%s topic=%s partition=%d offset=%d%n",
            record.key(), record.value(), record.topic(), record.partition(), record.offset());
    }

    /**
     * Seek to beginning of the given partition.
     * @param partition the topic partition
     */
    public void seekToBeginning(TopicPartition partition) {
        consumer.seekToBeginning(Collections.singletonList(partition));
    }

    /**
     * Wake up the consumer, causing poll() to throw WakeupException.
     */
    public void wakeup() {
        closed = true;
        consumer.wakeup();
    }

    @Override
    public void close() {
        wakeup();
    }
}
