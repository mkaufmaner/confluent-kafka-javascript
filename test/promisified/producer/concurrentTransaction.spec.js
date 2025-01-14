const {
    secureRandom,
    createProducer,
    createTopic,
} = require('../testhelpers')

describe('Producer > Transactional producer', () => {
    let producer1, producer2, topicName, transactionalId, message;

    const newProducer = () =>
        createProducer({
            idempotent: true,
            transactionalId,
            transactionTimeout: 1000,
        });

    beforeEach(async () => {
        topicName = `test-topic-${secureRandom()}`;
        transactionalId = `transactional-id-${secureRandom()}`;
        message = { key: `key-${secureRandom()}`, value: `value-${secureRandom()}` };

        await createTopic({ topic: topicName });
    })

    afterEach(async () => {
        producer1 && (await producer1.disconnect());
        producer2 && (await producer2.disconnect());
    })

    describe('when there is an ongoing transaction on connect', () => {
        it('retries initProducerId to cancel the ongoing transaction',
            async () => {
                // Producer 1 will create a transaction and "crash", it will never commit or abort the connection
                producer1 = newProducer();
                await producer1.connect();
                const transaction1 = await producer1.transaction();
                expect(transaction1.isActive()).toBe(true);
                await transaction1.send({ topic: topicName, messages: [message] });

                // Producer 2 starts with the same transactional id to cause the concurrent transactions error
                producer2 = newProducer();
                await producer2.connect();
                let transaction2;
                await expect(producer2.transaction().then(t => (transaction2 = t))).resolves.toBeTruthy();
                await transaction2.send({ topic: topicName, messages: [message] });
                await transaction2.commit();
            }
        )
    })
})
