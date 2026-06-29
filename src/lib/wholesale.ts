/**
 * Dynamic Wholesale (B2B) Pricing & Configuration Helpers
 */

export interface WholesaleTier {
  minQty: number;
  maxQty: number | null;
  discountPercent: number;
}

export interface WholesaleExclusivePrice {
  userId?: string;
  groupName?: string;
  target?: string;
  price: number;
}

/**
 * Calculates the active unit price for a product based on customer status, quantity, and specific rules.
 */
export function calculateWholesalePrice(
  product: {
    price: number;
    discount?: number | null;
    wholesalePrice?: number | null;
    wholesaleTiers?: string | any[] | null;
    wholesaleExclusivePrices?: string | any[] | null;
  },
  quantity: number,
  user?: {
    id: string;
    isWholesaler: boolean;
    wholesaleGroup?: string | null;
    group?: string | null;
  } | null
): {
  unitPrice: number;
  originalPrice: number;
  discountPercent: number;
  priceSource: 'regular' | 'wholesale_base' | 'exclusive_user' | 'exclusive_group' | 'tier_discount';
} {
  const basePrice = product.price;
  const regularDiscountAmount = product.discount || 0;
  const regularDiscountPercent = basePrice > 0 ? Math.round((regularDiscountAmount / basePrice) * 100) : 0;
  const regularPrice = basePrice - regularDiscountAmount;

  // 1. If user is not logged in or is not a wholesaler, return regular price
  if (!user || !user.isWholesaler) {
    return {
      unitPrice: regularPrice,
      originalPrice: basePrice,
      discountPercent: regularDiscountPercent,
      priceSource: 'regular',
    };
  }

  // 2. Determine base wholesale price
  let activeBasePrice = product.wholesalePrice !== undefined && product.wholesalePrice !== null && Number(product.wholesalePrice) > 0
    ? Number(product.wholesalePrice)
    : basePrice;
  
  let source: 'regular' | 'wholesale_base' | 'exclusive_user' | 'exclusive_group' | 'tier_discount' = 'wholesale_base';

  // 3. Check exclusive prices for customer / customer group
  let exclusivePrices: WholesaleExclusivePrice[] = [];
  if (product.wholesaleExclusivePrices) {
    try {
      exclusivePrices = typeof product.wholesaleExclusivePrices === 'string'
        ? JSON.parse(product.wholesaleExclusivePrices)
        : product.wholesaleExclusivePrices;
    } catch (e) {
      console.error('Error parsing wholesale exclusive prices:', e);
    }
  }

  if (Array.isArray(exclusivePrices) && exclusivePrices.length > 0) {
    // Check specific user ID match or target match (can be user.id or user.email)
    const userMatch = exclusivePrices.find(ep => 
      (ep.userId && ep.userId === user.id) ||
      (ep.target && (ep.target === user.id || ep.target.toLowerCase().trim() === (user as any).email?.toLowerCase().trim()))
    );
    if (userMatch) {
      activeBasePrice = userMatch.price;
      source = 'exclusive_user';
    } else {
      // Check group or wholesaleGroup match or target match
      const groupMatch = exclusivePrices.find(ep => 
        (ep.groupName && user.wholesaleGroup && ep.groupName.toLowerCase().trim() === user.wholesaleGroup.toLowerCase().trim()) ||
        (ep.groupName && user.group && ep.groupName.toLowerCase().trim() === user.group.toLowerCase().trim()) ||
        (ep.target && user.wholesaleGroup && ep.target.toLowerCase().trim() === user.wholesaleGroup.toLowerCase().trim()) ||
        (ep.target && user.group && ep.target.toLowerCase().trim() === user.group.toLowerCase().trim())
      );
      if (groupMatch) {
        activeBasePrice = groupMatch.price;
        source = 'exclusive_group';
      }
    }
  }

  // 4. Check tiered discounts based on quantity
  let tiers: WholesaleTier[] = [];
  if (product.wholesaleTiers) {
    try {
      tiers = typeof product.wholesaleTiers === 'string'
        ? JSON.parse(product.wholesaleTiers)
        : product.wholesaleTiers;
    } catch (e) {
      console.error('Error parsing wholesale tiers:', e);
    }
  }

  let tierDiscountPercent = 0;
  if (Array.isArray(tiers) && tiers.length > 0) {
    const matchingTier = tiers.find(t => {
      const minQty = t.minQty !== undefined ? t.minQty : (t as any).minQuantity;
      const maxQty = t.maxQty !== undefined ? t.maxQty : (t as any).maxQuantity;
      return (
        minQty !== undefined &&
        quantity >= minQty && 
        (maxQty === null || maxQty === undefined || quantity <= maxQty)
      );
    });
    if (matchingTier) {
      tierDiscountPercent = matchingTier.discountPercent;
      source = 'tier_discount';
    }
  }

  const finalPrice = activeBasePrice - (activeBasePrice * tierDiscountPercent) / 100;

  return {
    unitPrice: finalPrice,
    originalPrice: activeBasePrice,
    discountPercent: tierDiscountPercent,
    priceSource: source,
  };
}
