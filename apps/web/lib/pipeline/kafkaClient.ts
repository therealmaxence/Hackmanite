import { Kafka, Producer, Consumer, KafkaConfig, Message } from 'kafkajs';
import { logger } from '@/lib/logger';

const kafkaBootstrap = process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:9092';
const clientId = process.env.KAFKA_CLIENT_ID || 'hackmanite-pipeline';

let kafka: Kafka | null = null;
let producer: Producer | null = null;

export function getKafka(): Kafka {
  if (!kafka) {
    const config: KafkaConfig = {
      clientId,
      brokers: kafkaBootstrap.split(',').map((b) => b.trim()),
      retry: {
        initialRetryTime: 100,
        retries: 5,
      },
    };
    kafka = new Kafka(config);
    logger.info('Kafka client initialized.', { brokers: config.brokers });
  }
  return kafka;
}

export async function getKafkaProducer(): Promise<Producer> {
  if (!producer) {
    const client = getKafka();
    producer = client.producer();
    await producer.connect();
    logger.info('Kafka producer connected successfully.');
  }
  return producer;
}

export async function publishMessage(topic: string, value: any, key?: string): Promise<void> {
  try {
    const prod = await getKafkaProducer();
    const message: Message = {
      key: key || undefined,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    };
    await prod.send({
      topic,
      messages: [message],
    });
  } catch (err: any) {
    logger.error('Failed to publish message to Kafka', { topic, error: err.message });
    throw err;
  }
}

export function createKafkaConsumer(groupId: string): Consumer {
  const client = getKafka();
  return client.consumer({ groupId });
}
