import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoriteItem {
  id: string; // Product ID
  title: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  imageUrl?: string;
  shortInfo?: string;
  stock?: number;
}

interface FavoritesState {
  items: FavoriteItem[];
  addToFavorites: (product: any) => void;
  removeFromFavorites: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addToFavorites: (product) => {
        const items = get().items;
        const existingItem = items.find(item => item.id === product.id);
        
        if (!existingItem) {
          set({
            items: [...items, {
              id: product.id,
              title: product.title,
              price: product.price,
              originalPrice: product.originalPrice,
              discount: product.discount,
              imageUrl: product.imageUrl,
              shortInfo: product.shortInfo || product.description || undefined,
              stock: product.stock,
            }]
          });
        }
      },

      removeFromFavorites: (id) => {
        set({
          items: get().items.filter(item => item.id !== id)
        });
      },
      
      isFavorite: (id) => {
        return get().items.some(item => item.id === id);
      }
    }),
    {
      name: 'shop-favorites-storage',
    }
  )
);
