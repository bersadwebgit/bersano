import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // Product ID is used as CartItem ID for local cart, combined with variantId if present
  productId: string;
  variantId?: string;
  categoryId?: string | null;
  title: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  colorName?: string;
  colorCode?: string;
  shortInfo?: string;
  imageUrl?: string;
  quantity: number;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'not_enough';
  currentStock?: number;
  type?: string;
  fileFormat?: string | null;
  fileSize?: string | null;
  isSetDiscount?: boolean;
  setName?: string;
  moq?: number;
  wholesaleUnitSize?: number;
  isWholesaleOnly?: boolean;
  discountMinQty?: number;
}

interface DiscountCode {
  code: string;
  discount: number;
  type: 'percentage' | 'flat';
  targetCategoryIds?: string | null;
  targetProductIds?: string | null;
  minQuantity?: number | null;
}

interface CartState {
  items: CartItem[];
  savedItems: CartItem[];
  discountCode: DiscountCode | null;
  addToCart: (product: any, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  saveForLater: (id: string) => void;
  moveToCart: (id: string) => void;
  removeFromSaved: (id: string) => void;
  updateStockStatus: (validations: { 
    id: string; 
    stockStatus: 'in_stock' | 'out_of_stock' | 'not_enough'; 
    currentStock: number;
    price?: number;
    originalPrice?: number;
    discount?: number;
    categoryId?: string | null;
    type?: string;
  }[]) => { priceIncreased: boolean; updatedItems: string[] };
  clearCart: () => void;
  applyDiscount: (code: string) => Promise<{ success: boolean; message: string }>;
  removeDiscount: () => void;
  getCartTotal: () => number;
  getOriginalTotal: () => number;
  getProductDiscountTotal: () => number;
  getFinalTotal: () => number;
  getDiscountAmount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      savedItems: [],
      discountCode: null,
      
      addToCart: (product, quantity = 1) => {
        const items = get().items;
        const cartItemId = product.variantId ? `${product.id}-${product.variantId}` : product.id;
        const existingItem = items.find(item => item.id === cartItemId);
        
        if (existingItem) {
          set({
            items: items.map(item => 
              item.id === cartItemId 
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          });
        } else {
          set({
            items: [...items, {
              id: cartItemId,
              productId: product.id,
              variantId: product.variantId,
              categoryId: product.categoryId,
              title: product.title,
              price: product.price,
              originalPrice: product.originalPrice,
              discount: product.discount,
              colorName: product.colorName,
              colorCode: product.colorCode,
              shortInfo: product.shortInfo,
              imageUrl: product.imageUrl,
              quantity,
              stockStatus: product.stockStatus || 'in_stock',
              currentStock: product.currentStock,
              type: product.type,
              fileFormat: product.fileFormat,
              fileSize: product.fileSize,
              moq: (product as any).moq,
              wholesaleUnitSize: (product as any).wholesaleUnitSize,
              isWholesaleOnly: (product as any).isWholesaleOnly,
              discountMinQty: (product as any).discountMinQty
            }]
          });
        }
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        set({
          items: get().items.map(item => 
            item.id === id ? { ...item, quantity } : item
          )
        });
      },

      removeFromCart: (id) => {
        set({
          items: get().items.filter(item => item.id !== id)
        });
      },

      saveForLater: (id) => {
        const itemToSave = get().items.find(item => item.id === id);
        if (itemToSave) {
          set({
            items: get().items.filter(item => item.id !== id),
            savedItems: [...get().savedItems, itemToSave]
          });
        }
      },

      moveToCart: (id) => {
        const itemToMove = get().savedItems.find(item => item.id === id);
        if (itemToMove) {
          set({
            savedItems: get().savedItems.filter(item => item.id !== id),
            items: [...get().items, itemToMove]
          });
        }
      },

      removeFromSaved: (id) => {
        set({
          savedItems: get().savedItems.filter(item => item.id !== id)
        });
      },

      updateStockStatus: (validations) => {
        let priceIncreased = false;
        const updatedItems: string[] = [];
        const currentItems = get().items;

        const newItems = currentItems.map(item => {
          const validation = validations.find(v => v.id === item.id);
          if (validation) {
            const hasPriceIncreased = validation.price !== undefined && validation.price > item.price;
            if (hasPriceIncreased) {
              priceIncreased = true;
              updatedItems.push(item.title);
            }

            return { 
              ...item, 
              stockStatus: validation.stockStatus, 
              currentStock: validation.currentStock,
              // Adjust quantity if not enough stock
              quantity: validation.stockStatus === 'not_enough' ? validation.currentStock : item.quantity,
              // Update prices if returned
              price: validation.price !== undefined ? validation.price : item.price,
              originalPrice: validation.originalPrice !== undefined ? validation.originalPrice : item.originalPrice,
              discount: validation.discount !== undefined ? validation.discount : item.discount,
              discountMinQty: (validation as any).discountMinQty !== undefined ? (validation as any).discountMinQty : item.discountMinQty,
              categoryId: validation.categoryId !== undefined ? validation.categoryId : item.categoryId,
              type: validation.type !== undefined ? validation.type : item.type,
            };
          }
          return item;
        });

        set({ items: newItems });
        return { priceIncreased, updatedItems };
      },

      clearCart: () => {
        set({ items: [], discountCode: null });
      },

      applyDiscount: async (code) => {
        try {
          const total = get().getCartTotal();
          const res = await fetch('/api/checkout/discount', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, cartTotal: total, items: get().items }),
          });
          const data = await res.json();
          
          if (res.ok) {
            set({ discountCode: data.discount });
            return { success: true, message: 'کد تخفیف اعمال شد.' };
          }
          return { success: false, message: data.error || 'کد تخفیف نامعتبر است.' };
        } catch (error) {
          return { success: false, message: 'خطا در ارتباط با سرور.' };
        }
      },

      removeDiscount: () => set({ discountCode: null }),

      getCartTotal: () => {
        const { items } = get();
        return items
          .filter(item => item.stockStatus !== 'out_of_stock')
          .reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      getOriginalTotal: () => {
        const { items } = get();
        return items
          .filter(item => item.stockStatus !== 'out_of_stock')
          .reduce((total, item) => total + ((item.originalPrice || item.price) * item.quantity), 0);
      },

      getProductDiscountTotal: () => {
        const { items } = get();
        return items
          .filter(item => item.stockStatus !== 'out_of_stock')
          .reduce((total, item) => {
            const original = item.originalPrice || item.price;
            return total + ((original - item.price) * item.quantity);
          }, 0);
      },

      getDiscountAmount: () => {
        const { discountCode, items } = get();
        if (!discountCode) return 0;
        
        const activeItems = items.filter(item => item.stockStatus !== 'out_of_stock');
        let eligibleTotal = 0;
        let hasCategoryRestriction = false;

        if (discountCode.targetCategoryIds) {
          try {
            const allowedCats = JSON.parse(discountCode.targetCategoryIds);
            if (Array.isArray(allowedCats) && allowedCats.length > 0) {
              hasCategoryRestriction = true;
              const eligibleItems = activeItems.filter(item => item.categoryId && allowedCats.includes(item.categoryId));
              eligibleTotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            }
          } catch (e) {
            console.error('Error parsing targetCategoryIds in client store:', e);
          }
        }

        const baseTotal = hasCategoryRestriction ? eligibleTotal : get().getCartTotal();

        if (discountCode.type === 'percentage') {
          return (baseTotal * discountCode.discount) / 100;
        }
        return Math.min(baseTotal, discountCode.discount);
      },

      getFinalTotal: () => {
        const total = get().getCartTotal();
        const discount = get().getDiscountAmount();
        return Math.max(0, total - discount); // Ensure it doesn't go below 0
      }
    }),
    {
      name: 'shop-cart-storage',
    }
  )
);