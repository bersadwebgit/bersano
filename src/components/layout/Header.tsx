'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, ShoppingCart, User, Search, Package, History, Heart, LogOut, Plus, Minus, Trash2, BookOpen, Store, LayoutGrid, Info, Phone } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import TopBanner from '@/components/layout/TopBanner';
import { DEFAULT_HEADER_CONFIG, type HeaderConfig } from '@/types/header';
import CategoryIcon from '@/components/CategoryIcon';

interface MenuItem {
  id: string;
  title: string;
  url: string;
  color?: string | null;
  icon?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  parentId?: string | null;
  children?: Category[];
}

interface HeaderProps {
  shopName: string;
  logoUrl?: string | null;
  menuItems: MenuItem[];
  categories?: Category[];
  config?: HeaderConfig;
}

export default function Header({ shopName, logoUrl, menuItems, categories = [], config }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const [visibleItems, setVisibleItems] = useState<MenuItem[]>([]);
  const [hiddenItems, setHiddenItems] = useState<MenuItem[]>([]);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [openCategoryIds, setOpenCategoryIds] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<{ products: any[]; posts: any[] }>({ products: [], posts: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const [isClient, setIsClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{name?: string, email?: string, avatarUrl?: string} | null>(null);
  
  useEffect(() => {
    setIsClient(true);
    // Unconditionally fetch profile to check if user is logged in
    // because customer_token and admin_token are httpOnly cookies
    fetch('/api/profile', { cache: 'no-store' })
      .then(res => {
        if (res.ok) {
          setIsLoggedIn(true);
          return res.json();
        }
        return null;
      })
      .then(data => {
        if (data && data.user) {
          setUser({
            name: data.user.name,
            email: data.user.email,
            avatarUrl: data.user.avatarUrl
          });
        }
      })
      .catch(console.error);
  }, []);

  const cartItems = useCartStore(state => state.items);
  const cartTotal = useCartStore(state => state.getCartTotal());
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeFromCart = useCartStore(state => state.removeFromCart);
  const cartItemCount = cartItems.filter(i => i.stockStatus !== 'out_of_stock').reduce((acc, item) => acc + item.quantity, 0);

  const [animateCart, setAnimateCart] = useState(false);
  const prevCartCountRef = useRef(cartItemCount);

  useEffect(() => {
    if (cartItemCount > prevCartCountRef.current) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 400);
      return () => clearTimeout(timer);
    }
    prevCartCountRef.current = cartItemCount;
  }, [cartItemCount]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsMobileMenuOpen(false);
      };
      document.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = original;
        document.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isMobileMenuOpen]);

  const toggleCategory = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenCategoryIds(prev => 
      prev.includes(id) ? prev.filter(catId => catId !== id) : [...prev, id]
    );
  };

  const navRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const renderIcon = (icon: string | null | undefined, extraClasses = "", imageUrl?: string | null) => {
    if (imageUrl) {
      return <img src={imageUrl} alt="Category" className={`w-4 h-4 object-contain rounded-sm ${extraClasses}`} />;
    }
    if (!icon) return null;
    return <CategoryIcon name={icon} className={`w-4 h-4 ${extraClasses}`} size={16} />;
  };

  const headerConfig: HeaderConfig = config
    ? { ...DEFAULT_HEADER_CONFIG, ...config, banner: { ...DEFAULT_HEADER_CONFIG.banner!, ...config.banner } }
    : DEFAULT_HEADER_CONFIG;

  const isShopVisible = headerConfig.showShop !== false;
  const isBlogVisible = headerConfig.showBlog !== false;
  const isAboutUsVisible = headerConfig.showAboutUs === true;
  const isContactUsVisible = headerConfig.showContactUs === true;

  // Combine menu items with categories if enabled
  // Filter out 'blog', 'shop', 'about-us', and 'contact-us' links from menu items if they are already explicitly shown as separate elements in the header config
  const allMenuItems = menuItems.filter(item => {
    const cleanUrl = item.url.trim().replace(/\/$/, '');
    const isBlog = cleanUrl === '/blog' || cleanUrl === 'blog';
    if (isBlog && isBlogVisible) {
      return false;
    }
    const isShop = cleanUrl === '/shop' || cleanUrl === 'shop';
    if (isShop && isShopVisible) {
      return false;
    }
    const isAboutUs = cleanUrl === '/pages/about-us' || cleanUrl === 'pages/about-us' || cleanUrl === '/about-us' || cleanUrl === 'about-us';
    if (isAboutUs && isAboutUsVisible) {
      return false;
    }
    const isContactUs = cleanUrl === '/pages/contact-us' || cleanUrl === 'pages/contact-us' || cleanUrl === '/contact-us' || cleanUrl === 'contact-us';
    if (isContactUs && isContactUsVisible) {
      return false;
    }
    return true;
  });

  // We don't merge categories into allMenuItems anymore, we handle them separately.

  // Handle responsive menu items
  useEffect(() => {
    const handleResize = () => {
      if (!navRef.current) return;
      
      setVisibleItems(allMenuItems);
      setHiddenItems([]);
      
      setTimeout(() => {
        if (!navRef.current) return;
        
        const containerWidth = navRef.current.clientWidth;
        const items = Array.from(navRef.current.children) as HTMLElement[];
        
        let currentWidth = 0;
        let visibleCount = 0;
        
        const moreButtonWidth = 80;
        
        for (let i = 0; i < items.length; i++) {
          currentWidth += items[i].offsetWidth + 16;
          if (currentWidth + moreButtonWidth > containerWidth && i < items.length - 1) {
            break;
          }
          visibleCount++;
        }
        
        if (visibleCount < allMenuItems.length) {
          setVisibleItems(allMenuItems.slice(0, visibleCount));
          setHiddenItems(allMenuItems.slice(visibleCount));
        }
      }, 50);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [allMenuItems.length]); // Re-run if length changes

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, []);

  // Real-time search effect
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults({ products: [], posts: [] });
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      setShowSearchResults(true);
      
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults({
          products: data.products || [],
          posts: data.posts || []
        });
      } catch (error) {
        console.error('Failed to fetch search results', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const searchRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push(`/`);
    }
  };

  // Render specific elements based on ID
  const renderElement = (elementId: string) => {
    switch (elementId) {
      case 'logo':
        return (
          <div key="logo" className="flex-shrink-0 flex items-center justify-center md:justify-start">
            <Link href="/" className="flex items-center gap-2 group">
              {logoUrl ? (
                <div className="h-10 w-10 relative overflow-hidden rounded-md flex-shrink-0">
                  <img 
                    src={logoUrl} 
                    alt={shopName} 
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-md bg-primary-100 dark:bg-primary-950/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl flex-shrink-0">
                  {shopName.charAt(0)}
                </div>
              )}
              <span className="font-bold text-lg text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px] group-hover:text-primary-600 transition-colors">
                {shopName}
              </span>
            </Link>
          </div>
        );
      
      case 'shop':
        if (!headerConfig.showShop) return null;
        return (
          <div key="shop" className="hidden md:flex items-center">
            <Link
              href="/shop"
              className="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 whitespace-nowrap py-2 px-2 flex items-center gap-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
            >
              <Store className="w-4 h-4 text-gray-500" />
              <span>فروشگاه</span>
            </Link>
          </div>
        );

      case 'blog':
        if (!headerConfig.showBlog) return null;
        return (
          <div key="blog" className="hidden md:flex items-center">
            <Link
              href="/blog"
              className="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 whitespace-nowrap py-2 px-2 flex items-center gap-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
            >
              <BookOpen className="w-4 h-4 text-gray-500" />
              <span>وبلاگ</span>
            </Link>
          </div>
        );

      case 'about_us':
        if (!headerConfig.showAboutUs) return null;
        return (
          <div key="about_us" className="hidden md:flex items-center">
            <Link
              href="/pages/about-us"
              className="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 whitespace-nowrap py-2 px-2 flex items-center gap-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
            >
              <Info className="w-4 h-4 text-gray-500" />
              <span>درباره ما</span>
            </Link>
          </div>
        );

      case 'contact_us':
        if (!headerConfig.showContactUs) return null;
        return (
          <div key="contact_us" className="hidden md:flex items-center">
            <Link
              href="/pages/contact-us"
              className="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 whitespace-nowrap py-2 px-2 flex items-center gap-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
            >
              <Phone className="w-4 h-4 text-gray-500" />
              <span>تماس با ما</span>
            </Link>
          </div>
        );

      case 'categories':
        if (!headerConfig.showCategories || categories.length === 0) return null;
        
        // Only get root categories
        const rootCategories = categories.filter(c => !c.parentId);
        
        return (
          <div key="categories" className="hidden md:flex items-center relative group" ref={categoriesDropdownRef}>
            <button
              aria-haspopup="true"
              className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 whitespace-nowrap py-2 px-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
            >
              دسته‌بندی‌ها
              <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            
            <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-200 transform origin-top-right">
              {rootCategories.map((cat) => {
                const hasChildren = cat.children && cat.children.length > 0;
                return (
                  <div key={cat.id} className="relative group/sub">
                    <Link
                      href={`/category/${cat.slug}`}
                      className="flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-primary-400 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {renderIcon(cat.icon, "text-gray-500", (cat as any).imageUrl)}
                        <span>{cat.name}</span>
                      </div>
                      {hasChildren && <ChevronDown className="h-4 w-4 rotate-90" />}
                    </Link>
                    
                    {hasChildren && (
                      <div className="absolute top-0 right-full mr-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible group-focus-within/sub:opacity-100 group-focus-within/sub:visible transition-all duration-200 transform origin-top-right">
                        {cat.children!.map((child) => (
                          <Link
                            key={child.id}
                            href={`/category/${child.slug}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-primary-400 transition-colors"
                          >
                            {renderIcon(child.icon, "text-gray-500", (child as any).imageUrl)}
                            <span>{child.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'menu':
        return (
          <div key="menu" className="hidden md:flex flex-1 items-center justify-center px-4 overflow-hidden">
            <nav ref={navRef} className="flex gap-4 w-full justify-center">
              {visibleItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  className={`text-sm font-medium whitespace-nowrap transition-colors py-2 px-2 flex items-center gap-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                    !item.color ? 'text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400' : 'hover:opacity-80'
                  }`}
                  style={item.color ? { color: item.color } : undefined}
                >
                  {renderIcon(item.icon)}
                  <span>{item.title}</span>
                </Link>
              ))}
              
              {hiddenItems.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                    aria-haspopup="true"
                    aria-expanded={isMoreDropdownOpen}
                    aria-label="آیتم‌های بیشتر منو"
                    className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 whitespace-nowrap py-2 px-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
                  >
                    بیشتر
                    <ChevronDown className={`h-4 w-4 transition-transform ${isMoreDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isMoreDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                      {hiddenItems.map((item) => (
                        <Link
                          key={item.id}
                          href={item.url}
                          className={`flex items-center gap-2 px-4 py-2 text-sm ${
                            !item.color ? 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50' : 'hover:opacity-80 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                          style={item.color ? { color: item.color } : undefined}
                          onClick={() => setIsMoreDropdownOpen(false)}
                        >
                          {renderIcon(item.icon)}
                          <span>{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>
        );

      case 'search':
        if (!headerConfig.showSearch) return null;
        return (
          <div key="search" className="hidden md:flex items-center relative" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative" role="search">
              <label htmlFor="header-search" className="sr-only">جستجو در فروشگاه</label>
              <input
                id="header-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setShowSearchResults(true);
                }}
                placeholder="جستجو..."
                className="w-48 lg:w-64 pl-10 pr-4 py-1.5 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-full text-sm focus:border-primary-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
              <button type="submit" aria-label="جستجو" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50">
                <Search className="w-4 h-4" />
              </button>
            </form>
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchQuery.trim().length >= 2 && (
              <div className="absolute top-full right-0 mt-2 w-full min-w-[360px] md:min-w-[420px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-[110]">
                {isSearching ? (
                  <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce [animation-delay:0.4s]"></span>
                    <span>در حال جستجو...</span>
                  </div>
                ) : (searchResults.products.length > 0 || searchResults.posts.length > 0) ? (
                  <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
                    
                    {/* Products Section */}
                    {searchResults.products.length > 0 && (
                      <div className="p-3">
                        <h5 className="text-[11px] font-black text-gray-400 dark:text-gray-500 px-2 pb-2 uppercase tracking-wider">محصولات ({searchResults.products.length.toLocaleString('fa-IR')})</h5>
                        <div className="space-y-1">
                          {searchResults.products.map((product) => (
                            <Link
                              key={product.id}
                              href={`/product/${product.id}`}
                              onClick={() => setShowSearchResults(false)}
                              className={`flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all ${product.stock <= 0 ? 'opacity-60' : ''}`}
                            >
                              <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 relative border border-gray-100 dark:border-gray-700">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                {product.brand && (
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500 block">{product.brand}</span>
                                )}
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {product.stock <= 0 ? (
                                    <span className="text-xs font-bold text-gray-500">
                                      ناموجود
                                    </span>
                                  ) : product.discount > 0 ? (
                                    <>
                                      <span className="text-xs font-black text-red-600 dark:text-red-400">
                                        {(product.price - (product.price * product.discount / 100)).toLocaleString('fa-IR')} تومان
                                      </span>
                                      <span className="text-[10px] text-gray-400 line-through">
                                        {product.price.toLocaleString('fa-IR')}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs font-black text-gray-900 dark:text-white">
                                      {product.price.toLocaleString('fa-IR')} تومان
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Blog Posts Section */}
                    {searchResults.posts.length > 0 && (
                      <div className="p-3">
                        <h5 className="text-[11px] font-black text-gray-400 dark:text-gray-500 px-2 pb-2 uppercase tracking-wider">مقالات و وبلاگ ({searchResults.posts.length.toLocaleString('fa-IR')})</h5>
                        <div className="space-y-1">
                          {searchResults.posts.map((post) => (
                            <Link
                              key={post.id}
                              href={`/blog/${post.slug}`}
                              onClick={() => setShowSearchResults(false)}
                              className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all"
                            >
                              <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 relative border border-gray-100 dark:border-gray-700">
                                {post.featuredImage ? (
                                  <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <BookOpen className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{post.title}</h4>
                                {post.summary && (
                                  <p className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-1 mt-0.5">{post.summary}</p>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View all results button */}
                    <div className="p-2 bg-gray-50/50 dark:bg-gray-800/50">
                      <Link
                        href={`/shop?search=${encodeURIComponent(searchQuery)}`}
                        onClick={() => setShowSearchResults(false)}
                        className="block w-full py-2.5 text-center text-xs text-primary-600 dark:text-primary-400 font-bold hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm"
                      >
                        مشاهده همه نتایج محصولات و وبلاگ
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400 flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    <span>نتیجه‌ای یافت نشد.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'cart':
        if (!headerConfig.showCart) return null;
        if (!isClient) return <div key="cart" className="w-9 h-9"></div>;
        return (
          <div key="cart" className="flex items-center relative group">
            <Link href="/cart" aria-label={`سبد خرید${cartItemCount > 0 ? ` (${cartItemCount} کالا)` : ''}`} className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors relative rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50">
              <ShoppingCart className={`h-5 w-5 transition-transform duration-300 ${animateCart ? 'animate-wiggle text-primary-600 dark:text-primary-400' : ''}`} />
              {cartItemCount > 0 && (
                <span className={`absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white transition-all duration-300 ${animateCart ? 'scale-125 shadow-md shadow-red-500/20' : 'scale-100'}`}>
                  {cartItemCount}
                </span>
              )}
            </Link>
            
            {/* Cart Hover Dropdown */}
            <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-200 transform origin-top-left">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-bold text-gray-900 dark:text-white">سبد خرید شما</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">({cartItemCount} کالا)</span>
              </div>
              
              {cartItems.filter(i => i.stockStatus !== 'out_of_stock').length > 0 ? (
                <>
                  <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                    {cartItems.filter(i => i.stockStatus !== 'out_of_stock').map((item) => (
                      <div key={item.id} className="flex gap-3 items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors group/item relative">
                        <div className="w-12 h-12 rounded-md bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 relative">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-medium text-gray-900 dark:text-white truncate pr-6">{item.title}</h5>
                          {item.colorName && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <span className="w-2 h-2 rounded-full border border-gray-200" style={{ backgroundColor: item.colorCode }}></span>
                              {item.colorName}
                            </span>
                          )}
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="text-xs font-bold text-gray-900 dark:text-white">
                              {item.price.toLocaleString('fa-IR')} تومان
                            </div>
                            
                            <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                              <button 
                                onClick={(e) => { e.preventDefault(); updateQuantity(item.id, item.quantity + 1); }}
                                aria-label="افزایش تعداد"
                                className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-medium text-gray-900 dark:text-white">
                                {item.quantity}
                              </span>
                              <button 
                                onClick={(e) => { 
                                  e.preventDefault();
                                  if (item.quantity > 1) {
                                    updateQuantity(item.id, item.quantity - 1);
                                  } else {
                                    removeFromCart(item.id);
                                  }
                                }}
                                aria-label={item.quantity === 1 ? 'حذف کالا' : 'کاهش تعداد'}
                                className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                              >
                                {item.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.preventDefault(); removeFromCart(item.id); }}
                          aria-label="حذف از سبد خرید"
                          className="absolute top-2 left-2 text-gray-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 focus:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">مبلغ کل:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{cartTotal.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <Link
                      href="/cart"
                      className="block w-full py-2 bg-primary-600 hover:bg-primary-700 text-white text-center text-sm font-medium rounded-lg transition-colors"
                    >
                      مشاهده سبد خرید
                    </Link>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-2">
                    <ShoppingCart className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">سبد خرید شما خالی است</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'user':
        if (!headerConfig.showUser) return null;
        return (
          <div key="user" className="flex items-center relative group">
            <Link href={isLoggedIn ? "/profile" : "/login"} aria-label={isLoggedIn ? (user?.name || 'حساب کاربری') : 'ورود / ثبت‌نام'} className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors hidden sm:flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50">
              {isLoggedIn && user?.name ? (
                <span className="text-sm font-medium hidden lg:block">{user.name}</span>
              ) : null}
              {isLoggedIn && user?.avatarUrl ? (
                <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                </div>
              ) : (
                <User className="h-5 w-5" />
              )}
            </Link>
            
            {/* User Hover Dropdown */}
            <div className="hidden sm:block absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-200 transform origin-top-left">
              {isLoggedIn ? (
                <>
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-950/30 flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0 overflow-hidden">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name || 'حساب کاربری'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate dir-ltr text-right">{user?.email || ''}</div>
                    </div>
                  </div>
                  
                  <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-primary-400 transition-colors">
                    <User className="w-4 h-4 text-gray-400" />
                    داشبورد کاربری
                  </Link>
                  
                  <Link href="/profile/orders" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-primary-400 transition-colors">
                    <Package className="w-4 h-4 text-gray-400" />
                    سفارش‌های من
                  </Link>
                  
                  <Link href="/profile/favorites" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-primary-400 transition-colors">
                    <Heart className="w-4 h-4 text-gray-400" />
                    علاقه‌مندی‌ها
                  </Link>
                  
                  <Link href="/profile/history" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-primary-400 transition-colors">
                    <History className="w-4 h-4 text-gray-400" />
                    بازدیدهای اخیر
                  </Link>
                  
                  <div className="mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={async () => {
                      await fetch('/api/auth/customer/logout', { method: 'POST' });
                      window.location.href = '/login';
                    }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
                      <LogOut className="w-4 h-4" />
                      خروج از حساب
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    هنوز وارد نشده اید
                  </div>
                  <Link href="/login" className="inline-block px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
                    ورود / ثبت‌نام
                  </Link>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`${headerConfig.sticky !== false ? "sticky top-0" : "relative"} ${isMobileMenuOpen ? "z-[9999]" : "z-[100]"}`}>
      {headerConfig.banner && <TopBanner banner={headerConfig.banner} />}
      {/* Subtle, elegant, glowing brand accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-primary-500/10 via-primary-500 to-primary-500/10 shadow-[0_1px_8px_color-mix(in_srgb,var(--primary)_30%,transparent)]" />
    <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75 dark:supports-[backdrop-filter]:bg-gray-900/75 border-b border-gray-200/80 dark:border-gray-800/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu-drawer"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 rounded-lg p-2 -ml-2 transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Dynamic Ordered Elements */}
          <div className="hidden md:flex items-center justify-between w-full gap-4 lg:gap-6">
            {headerConfig.elementsOrder.map(renderElement)}
          </div>

          {/* Mobile View (Fixed Layout) */}
          <div className="md:hidden flex flex-1 items-center justify-between">
            <div className="flex-1 flex justify-center">
              {renderElement('logo')}
            </div>
            <div className="flex items-center gap-2">
              {headerConfig.showCart && (
                <Link href="/cart" aria-label={`سبد خرید${isClient && cartItemCount > 0 ? ` (${cartItemCount} کالا)` : ''}`} className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors relative rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50">
                  <ShoppingCart className={`h-5 w-5 transition-transform duration-300 ${animateCart ? 'animate-wiggle text-primary-600 dark:text-primary-400' : ''}`} />
                  {isClient && cartItemCount > 0 && (
                    <span className={`absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white transition-all duration-300 ${animateCart ? 'scale-125 shadow-md shadow-red-500/20' : 'scale-100'}`}>
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9998] md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div
        id="mobile-menu-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="منوی فروشگاه"
        className={`
        fixed inset-y-0 right-0 z-[9999] w-80 bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200 md:hidden transition-all duration-300 ease-in-out transform shadow-2xl flex flex-col border-l border-gray-100 dark:border-gray-900
        ${isMobileMenuOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible pointer-events-none'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-900/60 bg-gray-50/50 dark:bg-gray-900/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-white">منوی فروشگاه</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="بستن منو"
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-5 space-y-6">
          {headerConfig.showSearch && (
            <div className="space-y-2">
              <form onSubmit={(e) => { handleSearch(e); setIsMobileMenuOpen(false); }} className="relative" role="search">
                <label htmlFor="mobile-search" className="sr-only">جستجو در فروشگاه</label>
                <input
                  id="mobile-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در فروشگاه..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800/80 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:bg-white dark:focus:bg-gray-950 focus:ring-4 focus:ring-primary-500/10 transition-all"
                />
                <button type="submit" aria-label="جستجو" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </form>

              {/* Mobile live search results */}
              {searchQuery.trim().length >= 2 && (
                <div className="bg-gray-50/80 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-900 overflow-hidden shadow-sm">
                  {isSearching ? (
                    <div className="p-4 text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:0.4s]"></span>
                      <span>در حال جستجو...</span>
                    </div>
                  ) : (searchResults.products.length > 0 || searchResults.posts.length > 0) ? (
                    <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-900/60">
                      
                      {/* Mobile Products */}
                      {searchResults.products.length > 0 && (
                        <div className="p-2">
                          <h5 className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-2 pb-1.5 uppercase tracking-wider">محصولات</h5>
                          <div className="space-y-1">
                            {searchResults.products.map((product) => (
                              <Link
                                key={product.id}
                                href={`/product/${product.id}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-900/60 rounded-xl transition-colors ${product.stock <= 0 ? 'opacity-60' : ''}`}
                              >
                                <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 overflow-hidden flex-shrink-0">
                                  {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                                      <Package className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{product.title}</h4>
                                  <div className="mt-0.5 text-[10px]">
                                    {product.stock <= 0 ? (
                                      <span className="font-bold text-gray-400 dark:text-gray-500">ناموجود</span>
                                    ) : product.discount > 0 ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-red-500 dark:text-red-400">
                                          {(product.price - (product.price * product.discount / 100)).toLocaleString('fa-IR')} تومان
                                        </span>
                                        <span className="text-[9px] text-gray-400 line-through">{product.price.toLocaleString('fa-IR')}</span>
                                      </div>
                                    ) : (
                                      <span className="font-bold text-gray-600 dark:text-gray-400">{product.price.toLocaleString('fa-IR')} تومان</span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mobile Blog Posts */}
                      {searchResults.posts.length > 0 && (
                        <div className="p-2">
                          <h5 className="text-[10px] font-black text-gray-400 dark:text-gray-500 px-2 pb-1.5 uppercase tracking-wider">مقالات و وبلاگ</h5>
                          <div className="space-y-1">
                            {searchResults.posts.map((post) => (
                              <Link
                                key={post.id}
                                href={`/blog/${post.slug}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-900/60 rounded-xl transition-colors"
                              >
                                <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 overflow-hidden flex-shrink-0">
                                  {post.featuredImage ? (
                                    <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                                      <BookOpen className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{post.title}</h4>
                                  {post.summary && (
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1 mt-0.5">{post.summary}</p>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      <Link
                        href={`/shop?search=${encodeURIComponent(searchQuery)}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block p-3 text-center text-xs font-bold text-primary-600 dark:text-primary-400 hover:bg-white dark:hover:bg-gray-900/60 transition-colors"
                      >
                        مشاهده همه نتایج
                      </Link>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-gray-400 dark:text-gray-500">نتیجه‌ای یافت نشد.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {headerConfig.showCategories && categories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <LayoutGrid className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  دسته‌بندی محصولات
                </span>
              </div>
              <div className="space-y-1.5">
                {categories.filter(c => !c.parentId).map((cat) => {
                  const hasChildren = cat.children && cat.children.length > 0;
                  const isOpen = openCategoryIds.includes(cat.id);
                  const isActive = pathname === `/category/${cat.slug}`;
                  
                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className={`flex items-center justify-between rounded-xl transition-all duration-200 ${
                        isActive 
                          ? 'bg-primary-50/80 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 font-semibold' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-700 dark:text-gray-300'
                      }`}>
                        <Link
                          href={`/category/${cat.slug}`}
                          className="flex-1 flex items-center gap-3 px-3 py-2.5 text-sm"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <div className={`transition-colors ${isActive ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}`}>
                            {renderIcon(cat.icon, "w-4 h-4", (cat as any).imageUrl)}
                          </div>
                          <span>{cat.name}</span>
                        </Link>
                        {hasChildren && (
                          <button 
                            onClick={(e) => toggleCategory(cat.id, e)}
                            className={`p-2.5 ml-1 rounded-lg transition-colors ${
                              isOpen 
                                ? 'text-primary-500 bg-primary-50/50 dark:bg-primary-950/10' 
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                            }`}
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                      
                      {hasChildren && isOpen && (
                        <div className="mr-6 pr-4 border-r border-gray-100 dark:border-gray-900 space-y-1 mt-1">
                          {cat.children!.map((child) => {
                            const isChildActive = pathname === `/category/${child.slug}`;
                            return (
                              <Link
                                key={child.id}
                                href={`/category/${child.slug}`}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
                                  isChildActive
                                    ? 'text-primary-600 dark:text-primary-400 font-semibold bg-primary-50/30 dark:bg-primary-950/10'
                                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-900/30'
                                }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0" />
                                <span>{child.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Menu className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                دسترسی سریع
              </span>
            </div>
            <div className="space-y-1.5">
              {isShopVisible && (
                <Link
                  href="/shop"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    pathname === '/shop'
                      ? 'bg-primary-50/80 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Store className={`w-4 h-4 ${pathname === '/shop' ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span>فروشگاه</span>
                </Link>
              )}

              {isBlogVisible && (
                <Link
                  href="/blog"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    pathname === '/blog'
                      ? 'bg-primary-50/80 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <BookOpen className={`w-4 h-4 ${pathname === '/blog' ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span>وبلاگ</span>
                </Link>
              )}

              {headerConfig.showAboutUs && (
                <Link
                  href="/pages/about-us"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    pathname === '/pages/about-us'
                      ? 'bg-primary-50/80 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Info className={`w-4 h-4 ${pathname === '/pages/about-us' ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span>درباره ما</span>
                </Link>
              )}

              {headerConfig.showContactUs && (
                <Link
                  href="/pages/contact-us"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    pathname === '/pages/contact-us'
                      ? 'bg-primary-50/80 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Phone className={`w-4 h-4 ${pathname === '/pages/contact-us' ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span>تماس با ما</span>
                </Link>
              )}

              {allMenuItems.length > 0 && (
                <>
                  {allMenuItems.map((item) => {
                    const isItemActive = pathname === item.url;
                    return (
                      <Link
                        key={item.id}
                        href={item.url}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                          isItemActive
                            ? 'bg-primary-50/80 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 font-semibold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50'
                        }`}
                        style={item.color && !isItemActive ? { color: item.color } : undefined}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <div className={`${isItemActive ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}`}>
                          {renderIcon(item.icon, "w-4 h-4")}
                        </div>
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
        
        {headerConfig.showUser && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-900/60 bg-gray-50/30 dark:bg-gray-900/10">
            {isClient && isLoggedIn ? (
              <div className="space-y-4">
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all duration-200"
                >
                  <div className="w-11 h-11 rounded-full bg-primary-50 dark:bg-primary-950/30 overflow-hidden flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0 ring-2 ring-primary-500/10">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name || 'حساب کاربری'}</div>
                    {user?.email && <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate dir-ltr text-right mt-0.5">{user.email}</div>}
                  </div>
                </Link>

                <div className="grid grid-cols-3 gap-2">
                  <Link 
                    href="/profile/orders" 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl text-[11px] font-bold transition-all duration-200 ${
                      pathname === '/profile/orders'
                        ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>سفارش‌ها</span>
                  </Link>
                  <Link 
                    href="/profile/favorites" 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl text-[11px] font-bold transition-all duration-200 ${
                      pathname === '/profile/favorites'
                        ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    <span>علاقه‌مندی</span>
                  </Link>
                  <Link 
                    href="/profile/history" 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl text-[11px] font-bold transition-all duration-200 ${
                      pathname === '/profile/history'
                        ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>بازدیدها</span>
                  </Link>
                </div>

                <button
                  onClick={async () => {
                    await fetch('/api/auth/customer/logout', { method: 'POST' });
                    window.location.href = '/login';
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/10 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>خروج از حساب</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold transition-all duration-200 shadow-md shadow-primary-500/10 hover:shadow-primary-500/20 hover:-translate-y-0.5 active:translate-y-0"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                <span>ورود / ثبت‌نام</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}