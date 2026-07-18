process.env.AI_ALLOW_DIRECT_OPENROUTER = 'true';

export const mockRedisStore = new Map<string, string>();
export const mockRedis = {
  get: async (key: string) => mockRedisStore.get(key) || null,
  set: async (key: string, value: string) => {
    mockRedisStore.set(key, value);
    return 'OK';
  },
  incr: async (key: string) => {
    const val = parseInt(mockRedisStore.get(key) || '0') + 1;
    mockRedisStore.set(key, String(val));
    return val;
  },
  decr: async (key: string) => {
    const val = Math.max(0, parseInt(mockRedisStore.get(key) || '0') - 1);
    mockRedisStore.set(key, String(val));
    return val;
  },
};

// Mock Database State
export interface MockProduct {
  id: string;
  shopId: string;
  title: string;
  price: number;
  stock: number;
  brand: string;
  isActive: boolean;
}

export interface MockCategory {
  id: string;
  shopId: string;
  name: string;
  slug: string;
}

export interface MockOrder {
  id: string;
  shopId: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
}

export interface MockChangeSet {
  id: string;
  shopId: string;
  prompt: string;
  riskLevel: string;
  riskAnalysis?: string | null;
  summary?: string | null;
  steps: MockChangeStep[];
  status: string;
}

export interface MockChangeStep {
  id: string;
  changeSetId: string;
  action: string;
  modelName: string;
  recordId?: string | null;
  beforeValue?: Record<string, unknown> | null;
  afterValue?: Record<string, unknown> | null;
  status: string;
}

export const mockDb = {
  systemSettings: new Map<string, string>([
    ['ai_enabled', 'true'],
    ['openrouter_api_key', 'sk-or-mock-key'],
    ['ai_model_router', 'google/gemini-2.5-flash-lite'],
    ['ai_model_simple', 'google/gemini-2.5-flash'],
    ['ai_model_complex', 'anthropic/claude-sonnet-4-6'],
    ['ai_embedding_base_url', 'https://api.openai.com/v1'],
    ['ai_embedding_api_key', 'sk-emb-mock-key'],
    ['ai_model_embedding', 'openai/text-embedding-3-small'],
  ]),
  shopSettings: new Map<string, unknown>([
    ['shop_1', {
      shopId: 'shop_1',
      aiMemory: null,
      packageExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // Active package
      package: {
        features: JSON.stringify({
          aiAgentEnabled: true,
          aiRequestsLimit: 100,
        }),
      },
    }],
  ]),
  products: new Map<string, MockProduct>([
    ['prod_1', { id: 'prod_1', shopId: 'shop_1', title: 'گوشی آیفون ۱۳', price: 45000000, stock: 10, brand: 'Apple', isActive: true }],
    ['prod_2', { id: 'prod_2', shopId: 'shop_1', title: 'کفش ورزشی نایک', price: 2500000, stock: 5, brand: 'Nike', isActive: true }],
  ]),
  categories: new Map<string, MockCategory>([
    ['cat_1', { id: 'cat_1', shopId: 'shop_1', name: 'کالای دیجیتال', slug: 'digital' }],
  ]),
  orders: new Map<string, MockOrder>([
    ['order_1', { id: 'order_1', shopId: 'shop_1', status: 'pending', totalAmount: 45000000, createdAt: new Date() }],
  ]),
  changeSets: new Map<string, MockChangeSet>(),
  changeSteps: new Map<string, MockChangeStep>(),
  aiUsage: [] as unknown[],
};

// Mock Prisma Client
export const mockPrisma = {
  systemSetting: {
    findMany: async () => Array.from(mockDb.systemSettings.entries()).map(([key, value]) => ({ key, value })),
    findUnique: async ({ where }: { where: { key: string } }) => {
      const val = mockDb.systemSettings.get(where.key);
      return val ? { key: where.key, value: val } : null;
    },
  },
  shopSettings: {
    findUnique: async ({ where }: { where: { shopId: string } }) => mockDb.shopSettings.get(where.shopId) || null,
    findFirst: async ({ where }: { where: { shopId: string } }) => mockDb.shopSettings.get(where.shopId) || null,
  },
  product: {
    findFirst: async ({ where }: { where: { id?: string; shopId?: string } }) => {
      for (const p of mockDb.products.values()) {
        if (where.id && p.id !== where.id) continue;
        if (where.shopId && p.shopId !== where.shopId) continue;
        return p;
      }
      return null;
    },
    findMany: async ({ where, take }: { where: { shopId?: string }; take?: number }) => {
      const results = [];
      for (const p of mockDb.products.values()) {
        if (where.shopId && p.shopId !== where.shopId) continue;
        results.push(p);
        if (take && results.length >= take) break;
      }
      return results;
    },
    create: async ({ data }: { data: Omit<MockProduct, 'id'> }) => {
      const id = `prod_${Math.random().toString(36).substring(7)}`;
      const record = { id, ...data } as MockProduct;
      mockDb.products.set(id, record);
      return record;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<MockProduct> }) => {
      const record = mockDb.products.get(where.id);
      if (!record) throw new Error('Product not found');
      const updated = { ...record, ...data } as MockProduct;
      mockDb.products.set(where.id, updated);
      return updated;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const record = mockDb.products.get(where.id);
      if (!record) throw new Error('Product not found');
      mockDb.products.delete(where.id);
      return record;
    },
  },
  category: {
    findFirst: async ({ where }: { where: { id?: string; shopId?: string } }) => {
      for (const c of mockDb.categories.values()) {
        if (where.id && c.id !== where.id) continue;
        if (where.shopId && c.shopId !== where.shopId) continue;
        return c;
      }
      return null;
    },
    findMany: async ({ where, take }: { where: { shopId?: string }; take?: number }) => {
      const results = [];
      for (const c of mockDb.categories.values()) {
        if (where.shopId && c.shopId !== where.shopId) continue;
        results.push(c);
        if (take && results.length >= take) break;
      }
      return results;
    },
    create: async ({ data }: { data: Omit<MockCategory, 'id'> }) => {
      const id = `cat_${Math.random().toString(36).substring(7)}`;
      const record = { id, ...data } as MockCategory;
      mockDb.categories.set(id, record);
      return record;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<MockCategory> }) => {
      const record = mockDb.categories.get(where.id);
      if (!record) throw new Error('Category not found');
      const updated = { ...record, ...data } as MockCategory;
      mockDb.categories.set(where.id, updated);
      return updated;
    },
  },
  order: {
    findMany: async ({ where, take }: { where: { shopId?: string }; take?: number }) => {
      const results = [];
      for (const o of mockDb.orders.values()) {
        if (where.shopId && o.shopId !== where.shopId) continue;
        results.push(o);
        if (take && results.length >= take) break;
      }
      return results;
    },
  },
  aiChangeSet: {
    create: async ({ data }: { data: Record<string, unknown> & { steps?: { create?: Record<string, unknown>[] } } }) => {
      const id = `changeset_${Math.random().toString(36).substring(7)}`;
      const record: MockChangeSet = {
        id,
        shopId: (data.shopId as string) || 'shop_1',
        prompt: (data.prompt as string) || '',
        riskLevel: (data.riskLevel as string) || 'low',
        riskAnalysis: (data.riskAnalysis as string) || null,
        summary: (data.summary as string) || null,
        status: (data.status as string) || 'pending',
        steps: [],
      };
      mockDb.changeSets.set(id, record);
      if (data.steps && data.steps.create) {
        for (const step of data.steps.create) {
          const stepId = `step_${Math.random().toString(36).substring(7)}`;
          mockDb.changeSteps.set(stepId, {
            id: stepId,
            changeSetId: id,
            action: (step.action as string) || 'create',
            modelName: (step.modelName as string) || '',
            recordId: (step.recordId as string) || null,
            beforeValue: (step.beforeValue as Record<string, unknown>) || null,
            afterValue: (step.afterValue as Record<string, unknown>) || null,
            status: (step.status as string) || 'pending',
          });
        }
      }
      return record;
    },
    findFirst: async ({ where }: { where: { id: string } }) => {
      const cs = mockDb.changeSets.get(where.id);
      if (!cs) return null;
      const steps = Array.from(mockDb.changeSteps.values()).filter((s) => s.changeSetId === where.id);
      return { ...cs, steps };
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const cs = mockDb.changeSets.get(where.id);
      if (!cs) return null;
      const steps = Array.from(mockDb.changeSteps.values()).filter((s) => s.changeSetId === where.id);
      return { ...cs, steps };
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<MockChangeSet> }) => {
      const cs = mockDb.changeSets.get(where.id);
      if (!cs) throw new Error('ChangeSet not found');
      const updated = { ...cs, ...data } as MockChangeSet;
      mockDb.changeSets.set(where.id, updated);
      return updated;
    },
  },
  aiChangeStep: {
    createMany: async ({ data }: { data: Omit<MockChangeStep, 'id' | 'status'>[] }) => {
      for (const step of data) {
        const id = `step_${Math.random().toString(36).substring(7)}`;
        mockDb.changeSteps.set(id, { id, ...step, status: 'pending' });
      }
      return { count: data.length };
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<MockChangeStep> }) => {
      const step = mockDb.changeSteps.get(where.id);
      if (!step) throw new Error('Step not found');
      const updated = { ...step, ...data } as MockChangeStep;
      mockDb.changeSteps.set(where.id, updated);
      return updated;
    },
    updateMany: async ({ where, data }: { where: { changeSetId: string; status: string }; data: Partial<MockChangeStep> }) => {
      let count = 0;
      for (const [id, step] of mockDb.changeSteps.entries()) {
        if (where.changeSetId && step.changeSetId !== where.changeSetId) continue;
        const updated = { ...step, ...data } as MockChangeStep;
        mockDb.changeSteps.set(id, updated);
        count++;
      }
      return { count };
    },
  },
  aiUsage: {
    count: async () => mockDb.aiUsage.length,
    create: async ({ data }: { data: unknown }) => {
      mockDb.aiUsage.push(data);
      return data;
    },
  },
  $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
    return await callback(mockPrisma);
  },
  $queryRaw: async (queryObj: unknown) => {
    const sqlObj = queryObj as { values?: unknown[] };
    const values = sqlObj?.values || [];
    const shopId = (values.find(v => typeof v === 'string' && v.startsWith('shop_')) as string) || 'shop_1';
    
    const results = [];
    for (const p of mockDb.products.values()) {
      if (p.shopId === shopId) {
        results.push({
          id: p.id,
          title: p.title,
          price: p.price,
          discount: 0,
          stock: p.stock,
          imageUrl: null,
          isWholesaleOnly: false,
          score: 0.95,
        });
      }
    }
    return results;
  },
};

// Inject Globals BEFORE any imports
(globalThis as unknown as Record<string, unknown>).prismaGlobal = mockPrisma;
(globalThis as unknown as Record<string, unknown>).mockRedisGlobal = mockRedis;

export const mockCompletionResponse = {
  success: true,
  text: '{}',
};

(globalThis as unknown as Record<string, unknown>).mockChatCompletionGlobal = async (request: { model: string }) => {
  return {
    success: true,
    text: mockCompletionResponse.text,
    model: request.model,
  };
};

// Mock global fetch for embeddings
global.fetch = async (url: unknown, options?: unknown) => {
  if (!url) {
    throw new Error('URL is required');
  }
  if (options) {
    // options is provided
  }
  return {
    ok: true,
    json: async () => ({
      data: [{ embedding: new Array(1536).fill(0.1) }],
    }),
  } as unknown as Response;
};
