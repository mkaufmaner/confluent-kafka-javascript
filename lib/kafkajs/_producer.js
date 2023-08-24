const RdKafka = require('../rdkafka');
const { kafkaJSToRdKafkaConfig } = require('./_common');

const ProducerState = Object.freeze({
  INIT:   0,
  CONNECTING:  1,
  CONNECTED: 2,
  DISCONNECTING: 3,
  DISCONNECTED: 4,
});

class Producer {
  #kJSConfig = null
  #rdKafkaConfig = null;
  #internalClient = null;
  #connectPromiseFunc = {};
  #state = ProducerState.INIT;

  constructor(kJSConfig) {
    this.#kJSConfig = kJSConfig;
  }

  #config() {
    if (!this.#rdKafkaConfig)
      this.#rdKafkaConfig = this.#finalizedConfig();
    return this.#rdKafkaConfig;
  }

  async #finalizedConfig() {
    const config = await kafkaJSToRdKafkaConfig(this.#kJSConfig);
    config.dr_cb = 'true';
    return config;
  }

  #readyCb(arg) {
      //console.log('Connected and ready.');
      if (this.#state !== ProducerState.CONNECTING) {
          // I really don't know how to handle this now.
          return;
      }
      this.#state = ProducerState.CONNECTED;

      // Start a loop to poll.
      let pollInterval = setInterval(() => {
          if (this.#state >= ProducerState.DISCONNECTING) {
              clearInterval(pollInterval);
              return;
          }
          this.#internalClient.poll();
      }, 500);

      this.#internalClient.on('delivery-report', function(err, report) {
          //console.log('got delivery report', report, err);
          const opaque = report.opaque;
          if (!opaque) {
              // not sure how to handle this.
              return;
          }
          if (err) {
              opaque.reject('err out');
              return;
          }
          //console.log('delivery-report: ' + JSON.stringify(report));
          delete report['opaque'];

          const recordMetadata = {
            topicName: report.topic,
            partition: report.partition,
            errorCode: 0,
            baseOffset: report.offset,
            logAppendTime: null,
            logStartOffset: null,
          }

          opaque.resolve(recordMetadata);
      });

      // Resolve the promise.
      this.#connectPromiseFunc["resolve"]();
  }

  #errorCb(args) {
      console.log('error', args);
      if (this.#state === ProducerState.CONNECTING) {
          this.#connectPromiseFunc["reject"](args);
      } else {
          // do nothing for now.
      }
  }

  async connect() {
      if (this.#state !== ProducerState.INIT) {
          return Promise.reject("Connect has already been called elsewhere.");
      }

      this.#state = ProducerState.CONNECTING;
      this.#internalClient = new RdKafka.Producer(await this.#config());
      this.#internalClient.on('ready', this.#readyCb.bind(this));
      this.#internalClient.on('event.error', this.#errorCb.bind(this));
      this.#internalClient.on('event.log', console.log);

      return new Promise((resolve, reject) => {
          this.#connectPromiseFunc = {resolve, reject};
          console.log("Connecting....");
          this.#internalClient.connect();
          console.log("connect() called");
      });
  }

  async disconnect() {
    if (this.#state >= ProducerState.DISCONNECTING) {
      return;
    }
    this.#state = ProducerState.DISCONNECTING;
    await new Promise((resolve, reject) => {
      const cb = (err) => {
        err ? reject(err) : resolve();
        this.#state = ProducerState.DISCONNECTED;
      }
      this.#internalClient.disconnect(5000, cb);
    });
  }

  async send(sendOptions) {
      if (this.#state !== ProducerState.CONNECTED) {
          return Promise.reject("Cannot send message without awaiting connect()");
      }

      if (sendOptions === null || !(sendOptions instanceof Object)) {
          return Promise.reject("sendOptions must be set correctly");
      }

      // Ignore all properties except topic and messages.
      // TODO: log a warning instead of ignoring.
      if (!sendOptions.hasOwnProperty("topic") || !sendOptions.hasOwnProperty("messages") || !Array.isArray(sendOptions["messages"])) {
          // TODO: add further validations.
          return Promise.reject("sendOptions must be of the form {topic: string, messages: Message[]}");
      }

      const msgPromises = [];
      for (let i = 0; i < sendOptions.messages.length; i++) {
          const msg = sendOptions.messages[i];

          if (!msg.hasOwnProperty("partition") || msg.partition === null) {
              msg.partition = -1;
          }

          if (typeof msg.value === 'string') {
              msg.value = Buffer.from(msg.value);
          }

          msgPromises.push(new Promise((resolve, reject) => {
              const opaque = {resolve, reject};
              this.#internalClient.produce(sendOptions.topic, msg.partition, msg.value, msg.key, msg.timestamp ?? Date.now(), opaque, msg.headers);
          }));

      }
      const recordMetadataArr = await Promise.all(msgPromises);

      const topicPartitionRecordMetadata = new Map();
      for (const recordMetadata of recordMetadataArr) {
        const key = `${recordMetadata.topicName},${recordMetadata.partition}`;
        if (recordMetadata.baseOffset == null || !topicPartitionRecordMetadata.has(key)) {
          topicPartitionRecordMetadata.set(key, recordMetadata);
          continue;
        }

        const currentRecordMetadata = topicPartitionRecordMetadata.get(key);

        // Don't overwrite a null baseOffset
        if (currentRecordMetadata.baseOffset == null) {
          continue;
        }

        if (currentRecordMetadata.baseOffset > recordMetadata.baseOffset) {
          topicPartitionRecordMetadata.set(key, recordMetadata);
        }
      }

      const ret = [];
      for (const [key, value] of topicPartitionRecordMetadata.entries()) {
        value.baseOffset = value.baseOffset?.toString();
        ret.push(value);
      }
      return ret;
  }
}

module.exports = { Producer }