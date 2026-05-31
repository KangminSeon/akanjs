import type { BaseEnv } from "akanjs/base";
import { adapt } from "../adapt";
import type { AkanJob, AkanJobOptions, AkanWorker } from "../ipcTypes";
import { RedisCache } from "./cache.adaptor";

type QueueLike = {
  add(name: string, args: unknown[], options?: AkanJobOptions): Promise<unknown>;
};
type WorkerLike = AkanWorker;
type WorkerConstructor = new (
  name: string,
  handler: (job: AkanJob) => Promise<void>,
  options: { connection: unknown },
) => WorkerLike;
type QueueConstructor = new (
  name: string,
  options: { connection: unknown; defaultJobOptions: { removeOnComplete: boolean; removeOnFail: boolean } },
) => QueueLike;
type BullmqModule = {
  Queue: QueueConstructor;
  Worker: WorkerConstructor;
};
const bullmqPackage = "bullmq";

export interface QueueAdaptor {
  registerProcessWorker(key: string, handler: (job: AkanJob) => Promise<void>): AkanWorker;
  registerProcessQueue(key: string, args: unknown[], jobOptions?: AkanJobOptions): Promise<AkanJob>;
}

export class BullQueue
  extends adapt("bullQueue", ({ plug, env }) => ({
    redis: plug(RedisCache, (redisCache) => redisCache.getClient()),
    prefix: env((env: BaseEnv) => `queue-${env.repoName}-${env.appName}-${env.environment}-${env.operationMode}`),
  }))
  implements QueueAdaptor
{
  #queue!: QueueLike;
  #Worker!: WorkerConstructor;

  override async onInit(): Promise<void> {
    const { Queue, Worker } = (await import(bullmqPackage)) as BullmqModule;
    this.#Worker = Worker;
    this.#queue = new Queue(this.prefix, {
      connection: this.redis,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
    });
  }
  getQueue(): QueueLike {
    return this.#queue;
  }
  registerProcessWorker(key: string, handler: (job: AkanJob) => Promise<void>): WorkerLike {
    const worker = new this.#Worker(`${this.prefix}:${key}`, handler, {
      connection: this.redis,
    });
    return worker;
  }
  async registerProcessQueue(key: string, args: unknown[], jobOptions?: AkanJobOptions): Promise<AkanJob> {
    const job = await this.#queue.add(`${this.prefix}:${key}`, args, jobOptions);
    return job as unknown as AkanJob;
  }
}
