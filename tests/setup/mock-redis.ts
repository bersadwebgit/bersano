import { mockRedis } from '../../scripts/mock-setup';

(globalThis as any).mockRedisGlobal = mockRedis;
export { mockRedis };
