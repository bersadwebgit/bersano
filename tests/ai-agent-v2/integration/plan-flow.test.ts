import '../../../scripts/mock-setup';
import { createAgentPlan } from '../../../src/lib/ai-agent-v2/services/ai-agent-service';
import { getChangeSet } from '../../../src/lib/ai-agent-v2/persistence/change-set-repository';
import { executePlan } from '../../../src/lib/ai-agent-v2/services/execution-service';
import { mockCompletionResponse, mockDb } from '../../../scripts/mock-setup';
import { prisma } from '../../../src/lib/prisma';

export async function testPlanFlow() {
  console.log('   Checking Integration: Plan Generation Flow...');
  
  mockCompletionResponse.text = JSON.stringify({
    riskLevel: 'low',
    riskAnalysis: 'بدون ریسک خاص',
    summary: 'ویرایش قیمت محصول نایک',
    steps: [
      {
        action: 'update',
        modelName: 'Product',
        recordId: 'prod_2',
        afterValue: { price: 2700000 },
        order: 0,
      },
    ],
  });

  const { changeSetId } = await createAgentPlan({
    shopId: 'shop_1',
    prompt: 'قیمت کفش نایک را به ۲.۷ میلیون تغییر بده',
    actorId: 'user_admin',
  });

  const saved = await getChangeSet(changeSetId, 'shop_1');
  if (!saved || saved.steps.length !== 1) throw new Error('Failed to persist changeset plan or steps');

  console.log('   ✓ Plan generation flow is fully integrated and saved!');

  console.log('   Checking Integration: Reported Shoe request with Variants and Story Flow...');
  
  // Set up mock AI response for the multi-step shoe creation request
  mockCompletionResponse.text = JSON.stringify({
    riskLevel: 'medium',
    riskAnalysis: 'ایجاد کالا به همراه تنوع‌های رنگی و استوری',
    summary: 'ساخت کفش نایک ایر مکس به همراه ۵ رنگ و استوری تبلیغاتی',
    steps: [
      {
        action: 'create',
        modelName: 'Product',
        recordId: null,
        afterValue: {
          tempRef: 'temp_product_1',
          title: 'کفش نایک ایر مکس',
          price: 450000,
          stock: 50,
          isActive: true,
        },
        order: 0,
      },
      {
        action: 'create',
        modelName: 'ProductVariant',
        recordId: null,
        afterValue: {
          productId: 'temp_product_1',
          name: 'مشکی',
          price: 450000,
          stock: 10,
          optionsJson: '{"رنگ": "مشکی"}',
        },
        order: 1,
      },
      {
        action: 'create',
        modelName: 'ProductVariant',
        recordId: null,
        afterValue: {
          productId: 'temp_product_1',
          name: 'سفید',
          price: 450000,
          stock: 10,
          optionsJson: '{"رنگ": "سفید"}',
        },
        order: 2,
      },
      {
        action: 'create',
        modelName: 'ProductVariant',
        recordId: null,
        afterValue: {
          productId: 'temp_product_1',
          name: 'قرمز',
          price: 450000,
          stock: 10,
          optionsJson: '{"رنگ": "قرمز"}',
        },
        order: 3,
      },
      {
        action: 'create',
        modelName: 'ProductVariant',
        recordId: null,
        afterValue: {
          productId: 'temp_product_1',
          name: 'آبی',
          price: 450000,
          stock: 10,
          optionsJson: '{"رنگ": "آبی"}',
        },
        order: 4,
      },
      {
        action: 'create',
        modelName: 'ProductVariant',
        recordId: null,
        afterValue: {
          productId: 'temp_product_1',
          name: 'طوسی',
          price: 450000,
          stock: 10,
          optionsJson: '{"رنگ": "طوسی"}',
        },
        order: 5,
      },
      {
        action: 'create',
        modelName: 'Story',
        recordId: null,
        afterValue: {
          title: 'استوری تبلیغاتی کفش نایک ایر مکس',
          mediaUrl: '/uploads/story-nike.jpg',
          mediaType: 'image',
          linkUrl: 'temp_product_1',
          linkText: 'خرید کفش نایک ایر مکس',
        },
        order: 6,
      },
    ],
  });

  const { changeSetId: multiChangeSetId } = await createAgentPlan({
    shopId: 'shop_1',
    prompt: 'محصول کفش نایک ایر مکس با قیمت ۴۵۰ هزار تومن، ۵ رنگ (مشکی، سفید، قرمز، آبی، طوسی) و موجودی ۱۰ عدد از هر رنگ بساز و یک استوری تبلیغاتی هم برایش بذار',
    actorId: 'user_admin',
  });

  const savedMulti = await getChangeSet(multiChangeSetId, 'shop_1');
  if (!savedMulti || savedMulti.steps.length !== 7) {
    throw new Error(`Expected 7 steps, but got ${savedMulti?.steps?.length || 0}`);
  }

  // Set changeset status to approved to allow executing
  await prisma.aiChangeSet.update({
    where: { id: multiChangeSetId },
    data: { status: 'approved' },
  });

  // Execute the multi-step plan
  const execution = await executePlan(multiChangeSetId, 'shop_1', 'user_admin');
  if (!execution.success) {
    throw new Error(`Multi-step execution failed: ${execution.message}`);
  }

  // Retrieve the generated product, variants and story from mockDb
  const products = Array.from(mockDb.products.values());
  const createdShoe = products.find(p => p.title === 'کفش نایک ایر مکس');
  if (!createdShoe) {
    throw new Error('Failed to find created shoe product in mock database');
  }

  const variants = Array.from(mockDb.productVariants.values()).filter(v => v.productId === createdShoe.id);
  if (variants.length !== 5) {
    throw new Error(`Expected 5 variants for shoe product, but got ${variants.length}`);
  }

  for (const color of ['مشکی', 'سفید', 'قرمز', 'آبی', 'طوسی']) {
    const hasColor = variants.some(v => v.name === color && v.stock === 10 && v.price === 450000);
    if (!hasColor) {
      throw new Error(`Missing variant for color: ${color} with stock 10 and price 450000`);
    }
  }

  const stories = Array.from(mockDb.stories.values()).filter(s => s.linkUrl === createdShoe.id);
  if (stories.length !== 1) {
    throw new Error(`Expected 1 story linking to ${createdShoe.id}, but got ${stories.length}`);
  }

  console.log('   ✓ Reported Shoe request planning and multi-step execution successfully completed!');
  return true;
}
export { testPlanFlow as planFlow };
