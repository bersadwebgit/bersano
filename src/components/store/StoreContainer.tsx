'use client';

import { useState, useMemo, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import ProductList from './ProductList';
import StoryList from '@/components/stories/StoryList';
import ShoppableSection from '@/components/shoppable/ShoppableSection';
import CategorySeoSection from '@/components/store/CategorySeoSection';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal, Check, X, RotateCcw } from 'lucide-react';

interface StoreContainerProps {
  initialProducts: any[];
  initialCategories: any[];
  currentCategory?: any;
  showStories?: boolean;
  showShoppable?: boolean;
  brands?: any[];
  isWholesaler?: boolean;
  wholesaleEnabled?: boolean;
}

export default function StoreContainer({ 
  initialProducts, 
  initialCategories, 
  currentCategory,
  showStories = true, 
  showShoppable = true,
  brands = [],
  isWholesaler = false,
  wholesaleEnabled = false
}: StoreContainerProps) {
  const searchParams = useSearchParams();
  
  // Get max price from products for lazy state initialization
  const maxPrice = useMemo(() => {
    if (initialProducts.length === 0) return 100000000;
    return Math.max(...initialProducts.map(p => p.price));
  }, [initialProducts]);

  const [priceRange, setPriceRange] = useState<[number, number]>(() => [0, maxPrice]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Calculate active filters count dynamically
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory && selectedCategory !== 'all') count++;
    if (selectedBrand && selectedBrand !== 'all') count++;
    if (inStockOnly) count++;
    if (priceRange[1] < maxPrice) count++;
    return count;
  }, [selectedCategory, selectedBrand, inStockOnly, priceRange, maxPrice]);
  
  const brandParam = searchParams.get('brand') || '';

  // Reset filters when initial products or category changes (page navigation)
  useEffect(() => {
    setSelectedCategory('');
    setSelectedBrand(brandParam || 'all');
    setInStockOnly(false);
    setPriceRange([0, maxPrice]);
  }, [initialProducts, currentCategory, maxPrice, brandParam]);

  // Dynamically calculate available brands from products
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    initialProducts.forEach(p => {
      if (p.brand && p.brand.trim()) {
        brandsSet.add(p.brand.trim());
      }
    });
    return Array.from(brandsSet);
  }, [initialProducts]);
  
  // Tracking if circular stories exist to adjust shoppable layout
  const [activeStoriesCount, setActiveStoriesCount] = useState<number>(0);

  const searchQuery = searchParams.get('q') || '';

  // Client-side filtering to maintain ultra-fast sub-500ms page load speed
  const filteredProducts = useMemo(() => {
    return initialProducts.filter(product => {
      // 1. Search Query
      if (searchQuery && !product.title.toLowerCase().includes(searchQuery.toLowerCase()) && !product.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // 2. Category
      if (selectedCategory && selectedCategory !== 'all') {
        // If selectedCategory is parent category, include its children
        const isSelectedCat = product.categoryId === selectedCategory;
        const parentCategory = initialCategories.find(c => c.id === selectedCategory);
        const isChildCat = parentCategory?.children?.some((child: any) => child.id === product.categoryId);
        
        if (!isSelectedCat && !isChildCat) {
          return false;
        }
      }

      // 3. Price Range
      const finalPrice = product.discount 
        ? product.price - product.discount 
        : product.price;
      if (finalPrice < priceRange[0] || finalPrice > priceRange[1]) {
        return false;
      }

      // 4. In Stock Only
      if (inStockOnly && product.stock <= 0) {
        return false;
      }

      // 5. Brand
      if (selectedBrand && selectedBrand !== 'all') {
        if (!product.brand || product.brand.toLowerCase().trim() !== selectedBrand.toLowerCase().trim()) {
          return false;
        }
      }

      return true;
    });
  }, [initialProducts, searchQuery, selectedCategory, priceRange, inStockOnly, selectedBrand, initialCategories]);

  // Get active category for Dynamic Title & SEO
  const activeCategory = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') {
      return currentCategory;
    }
    // Find in initialCategories (parent categories)
    let found = initialCategories.find(c => c.id === selectedCategory);
    if (!found) {
      // Find in children of parent categories
      for (const cat of initialCategories) {
        if (cat.children) {
          const child = cat.children.find((c: any) => c.id === selectedCategory);
          if (child) {
            found = child;
            break;
          }
        }
      }
    }
    return found || currentCategory;
  }, [selectedCategory, initialCategories, currentCategory]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6">
      <Sidebar 
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        maxPrice={maxPrice}
        inStockOnly={inStockOnly}
        setInStockOnly={setInStockOnly}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={initialCategories}
        brands={availableBrands}
        selectedBrand={selectedBrand}
        setSelectedBrand={setSelectedBrand}
        brandsListWithLogos={brands}
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        totalProductsCount={filteredProducts.length}
      />
      
      <main className="flex-1 min-w-0 flex flex-col gap-6">
        
        {/* Dynamic Category Header */}
        {activeCategory && (
          <div className="px-1 border-b border-gray-100 dark:border-gray-800 pb-4">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
              {activeCategory.seoTitle || activeCategory.name}
            </h1>
            {activeCategory.description && (
              <p className="text-gray-550 dark:text-gray-400 text-sm leading-relaxed">
                {activeCategory.description}
              </p>
            )}
          </div>
        )}

        {/* Story List (Circular format) */}
        {showStories && (
          <StoryList 
            onSelectCategory={setSelectedCategory} 
            selectedCategory={selectedCategory} 
            onStoriesLoaded={(count) => setActiveStoriesCount(count)}
          />
        )}

        {/* Shoppable Section (Visual Shopping Pack)
            If stories are present, displays beautifully as a horizontal feed under them.
            If stories do not exist, expands in size to act as a prominent landing board. */}
        {showShoppable && (
          <ShoppableSection hasStories={activeStoriesCount > 0} />
        )}

        {searchQuery && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <p className="text-gray-700 dark:text-gray-300">
              نتایج جستجو برای: <span className="font-bold text-indigo-600 dark:text-indigo-400">{searchQuery}</span>
            </p>
            <button 
              onClick={() => window.location.href = '/'}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              پاک کردن
            </button>
          </div>
        )}

        {/* Active Filters Carousel (Mobile Only) */}
        {activeFiltersCount > 0 && (
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 px-1 -mx-4 border-b border-gray-100/60 dark:border-gray-800/40 bg-gray-50/20 dark:bg-gray-900/10">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold shrink-0 pl-1">فیلترها:</span>
            
            {inStockOnly && (
              <div className="flex items-center gap-1 bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0 border border-gray-100 dark:border-gray-800 shadow-3xs">
                <span>موجود</span>
                <button onClick={() => setInStockOnly(false)} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                  <X size={10} />
                </button>
              </div>
            )}

            {selectedCategory && selectedCategory !== 'all' && (() => {
              const activeCat = (initialCategories || []).find(c => c.id === selectedCategory) || 
                                (initialCategories || []).flatMap(c => c.children || []).find(c => c.id === selectedCategory);
              return activeCat ? (
                <div className="flex items-center gap-1 bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0 border border-gray-100 dark:border-gray-800 shadow-3xs">
                  <span>{activeCat.name}</span>
                  <button onClick={() => setSelectedCategory('')} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                    <X size={10} />
                  </button>
                </div>
              ) : null;
            })()}

            {selectedBrand && selectedBrand !== 'all' && (
              <div className="flex items-center gap-1 bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0 border border-gray-100 dark:border-gray-800 shadow-3xs">
                <span>{selectedBrand}</span>
                <button onClick={() => setSelectedBrand('all')} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                  <X size={10} />
                </button>
              </div>
            )}

            {priceRange[1] < maxPrice && (
              <div className="flex items-center gap-1 bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0 border border-gray-100 dark:border-gray-800 shadow-3xs">
                <span>تا {priceRange[1].toLocaleString('fa-IR')}</span>
                <button onClick={() => setPriceRange([0, maxPrice])} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                  <X size={10} />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setSelectedCategory('');
                setSelectedBrand('all');
                setInStockOnly(false);
                setPriceRange([0, maxPrice]);
              }}
              className="flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <RotateCcw size={10} />
              <span>حذف همه</span>
            </button>
          </div>
        )}

        <ProductList 
          products={filteredProducts} 
          onOpenMobileFilters={() => setIsMobileFilterOpen(true)}
          activeFiltersCount={activeFiltersCount}
          isWholesalerProp={isWholesaler}
          wholesaleEnabledProp={wholesaleEnabled}
        />

        {/* Dynamic Category SEO Description */}
        {activeCategory && (
          <CategorySeoSection 
            seoTitle={activeCategory.seoTitle} 
            seoDescription={activeCategory.seoDescription} 
            categoryName={activeCategory.name} 
          />
        )}
      </main>
    </div>
  );
}
