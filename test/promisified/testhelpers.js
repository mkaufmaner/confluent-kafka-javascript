const crypto = require('crypto')
const { Kafka, ErrorCodes } = require('../../lib').KafkaJS;

// TODO: pick this up from a file
const clusterInformation = {
    brokers: ['localhost:9092'],
};

function createConsumer(config) {
    const kafka = new Kafka(Object.assign(config, clusterInformation));
    return kafka.consumer();
}

function createProducer(config) {
    const kafka = new Kafka(Object.assign(config, clusterInformation));
    return kafka.producer();
}

function createAdmin(config) {
    const kafka = new Kafka(Object.assign(config, clusterInformation));
    return kafka.admin();
}

function secureRandom(length = 10) {
   return `${crypto.randomBytes(length).toString('hex')}-${process.pid}-${crypto.randomUUID()}`;
}

async function createTopic(args) {
    const { topic } = args;
    const admin = createAdmin({});
    await admin.connect();
    await admin.createTopics({ topics: [{topic}] });
    await admin.disconnect();
}

async function waitForConsumerToJoinGroup(consumer) {
    // We don't yet have a deterministic way to test this, so we just wait for a bit.
    return new Promise(resolve => setTimeout(resolve, 2500));
}

async function waitForMessages(messagesConsumed, { number } = {number: 0}) {
    return new Promise(resolve => {
        const interval = setInterval(() => {
            if (messagesConsumed.length >= number) {
                clearInterval(interval);
                resolve();
            }
        }, 200);
    });
}

module.exports = {
    createConsumer,
    createProducer,
    createAdmin,
    secureRandom,
    waitForMessages,
    waitForMessages,
    createTopic,
    waitForConsumerToJoinGroup,
}
