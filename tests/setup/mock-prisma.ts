import { mockPrisma } from '../../scripts/mock-setup';

(globalThis as any).prismaGlobal = mockPrisma;
export { mockPrisma };
