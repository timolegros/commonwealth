import { Consumer } from '../util/rabbitmq/consumer';
import RabbitMQConfig from '../util/rabbitmq/RabbitMQConfig';
import { Buckets, PrivateKey } from '@textile/hub';
import { bucketClient, bucketKeys } from '../../server';
import { factory, formatFilename } from '../../shared/logging';

const log = factory.getLogger(formatFilename(__filename));

async function main() {
  const consumer = new Consumer(RabbitMQConfig);
  await consumer.init();

  const user = await PrivateKey.fromRandom();
  const bucketClient = await Buckets.withKeyInfo({ key: process.env.HUB_CW_KEY });

  const token = await bucketClient.getToken(user);

  const result = await bucketClient.getOrCreate('Users');
  if (!result.root) {
    throw new Error('Failed to open bucket');
  }
  log.info(`IPNS address of Users bucket: ${result.root.key}`)
  log.info(`https://ipfs.io/ipns/${result.root.key}`)

  bucketKeys['Users'] = result.root.key


}
