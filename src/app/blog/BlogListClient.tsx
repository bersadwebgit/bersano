'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BlogFallbackImage from '@/components/blog/BlogFallbackImage';
import { 
  Search, 
  Calendar, 
  Clock, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Mail, 
  TrendingUp, 
  Tag as TagIcon,
  ChevronDown,
  Sparkles,
  ArrowLeft,
  LayoutGrid,
  List,
  ArrowUpDown,
  X,
  Eye,
  ShieldCheck,
  Send,
  CheckCircle2
} from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  featuredImage: string | null;
  publishedAt: string;
  viewCount: number;
  tags: string;
  category: { id: string; name: string; slug: string } | null;
  author: { name: string; avatarUrl: string | null } | null;
  _count: { comments: number };
}

interface BlogListClientProps {
  shopName: string;
  initialPosts: Post[];
  initialPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  initialPopularPosts: Post[];
  initialCategories: any[];
  initialPopularTags: any[];
  activeCategory: string;
  activeTag: string;
  activeSearch: string;
  activePage: number;
  activeSort?: string;
}

export default function BlogListClient({ 
  shopName,
  initialPosts,
  initialPagination,
  initialPopularPosts,
  initialCategories,
  initialPopularTags,
  activeCategory,
  activeTag,
  activeSearch,
  activePage,
  activeSort = 'latest'
}: BlogListClientProps) {
  const router = useRouter();

  // Search input query local state
  const [search, setSearch] = useState(activeSearch);
  const [searchSuggestions, setSearchSuggestions] = useState<Post[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Scrollable category tab bar
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [tabsOverflow, setTabsOverflow] = useState(false);

  // Core posts and pagination state for real-time updating
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [loadingNextPage, setLoadingNextPage] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Sort State
  const [sort, setSort] = useState(activeSort || 'latest');
  const [sortOpen, setSortOpen] = useState(false);

  // Blog Layout State (2 Column Grid vs List)
  const [blogLayout, setBlogLayout] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('blog-main-layout');
      if (saved === 'grid' || saved === 'list') {
        setBlogLayout(saved);
      }
    }
  }, []);

  const handleBlogLayoutChange = (lay: 'grid' | 'list') => {
    setBlogLayout(lay);
    localStorage.setItem('blog-main-layout', lay);
  };

  const isBlogGrid = blogLayout === 'grid';

  // Featured Posts Slider State (standard blog hero carousel)
  const [currentSlide, setCurrentSlide] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);
  // Prefer popular posts for the hero slider; fall back to the latest feed.
  const sliderPosts = initialPopularPosts.length > 0
    ? initialPopularPosts.slice(0, 5)
    : posts.slice(0, 5);

  // Newsletter states
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  // Touch handlers for slider swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchStartEnd] = useState<number | null>(null);

  // Sync state with props when server-side changes occur (e.g. category/tag navigation)
  useEffect(() => {
    setPosts(initialPosts);
    setPagination(initialPagination);
    setSort(activeSort || 'latest');
  }, [initialPosts, initialPagination, activeSort]);

  const loadMorePosts = async () => {
    if (loadingNextPage || pagination.page >= pagination.totalPages) return;

    setLoadingNextPage(true);
    try {
      const nextPage = pagination.page + 1;
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set('search', search.trim());
      if (activeCategory !== 'all') queryParams.set('category', activeCategory);
      if (activeTag !== 'all') queryParams.set('tag', activeTag);
      if (sort !== 'latest') queryParams.set('sort', sort);
      queryParams.set('page', nextPage.toString());
      queryParams.set('limit', '6');

      const res = await fetch(`/api/blog?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts((prevPosts) => {
          const existingIds = new Set(prevPosts.map((p) => p.id));
          const newPosts = data.posts.filter((p: Post) => !existingIds.has(p.id));
          return [...prevPosts, ...newPosts];
        });
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('[ERROR] [BlogListClient] Load more failed:', err);
    } finally {
      setLoadingNextPage(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && !loadingNextPage && pagination.page < pagination.totalPages && !loading) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    const currentObserverTarget = observerRef.current;
    if (currentObserverTarget) {
      observer.observe(currentObserverTarget);
    }

    return () => {
      if (currentObserverTarget) {
        observer.unobserve(currentObserverTarget);
      }
    };
  }, [loadingNextPage, pagination, loading]);

  // Sync local search input with activeSearch parameter on direct URL changes
  useEffect(() => {
    setSearch(activeSearch);
  }, [activeSearch]);

  // Click outside listener for search suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real-time suggestions
  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('search', search.trim());
        queryParams.set('limit', '5');

        const res = await fetch(`/api/blog?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setSearchSuggestions(data.posts || []);
        }
      } catch (err) {
        console.error('[ERROR] [BlogListClient] Suggestions fetch failed:', err);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // Real-time search with debounce for the main feed
  useEffect(() => {
    if (search === activeSearch) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (search.trim()) queryParams.set('search', search.trim());
        if (activeCategory !== 'all') queryParams.set('category', activeCategory);
        if (activeTag !== 'all') queryParams.set('tag', activeTag);
        if (sort !== 'latest') queryParams.set('sort', sort);
        queryParams.set('page', '1'); // Reset to page 1 on new search
        queryParams.set('limit', '6');

        const res = await fetch(`/api/blog?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts);
          setPagination(data.pagination);

          // Update browser URL without Next.js page transition lag
          const urlString = queryParams.toString() ? `/blog?${queryParams.toString()}` : '/blog';
          window.history.replaceState(null, '', urlString);
        }
      } catch (err) {
        console.error('[ERROR] [BlogListClient] Live search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search, activeCategory, activeTag, activeSearch, sort]);

  // Slider Autoplay (pauses on hover; resets after manual navigation)
  useEffect(() => {
    if (sliderPosts.length <= 1 || sliderPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderPosts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [sliderPosts.length, sliderPaused, currentSlide]);

  // Keep the active slide index valid when the underlying list changes
  useEffect(() => {
    if (sliderPosts.length > 0 && currentSlide >= sliderPosts.length) {
      setCurrentSlide(0);
    }
  }, [sliderPosts.length, currentSlide]);

  // Detect whether the category tab bar overflows (to show edge scroll arrows)
  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const check = () => setTabsOverflow(el.scrollWidth > el.clientWidth + 1);
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [initialCategories]);

  // Construct URL dynamically based on existing and new filters
  const getLinkUrl = ({ page, category, tag, searchVal, sortVal }: { page?: number; category?: string; tag?: string; searchVal?: string; sortVal?: string }) => {
    const query = new URLSearchParams();
    
    // Category filter
    const cat = category !== undefined ? category : activeCategory;
    if (cat && cat !== 'all') {
      query.set('category', cat);
    }
    
    // Tag filter
    const tg = tag !== undefined ? tag : activeTag;
    if (tg && tg !== 'all') {
      query.set('tag', tg);
    }
    
    // Search query
    const srch = searchVal !== undefined ? searchVal : search;
    if (srch && srch.trim()) {
      query.set('search', srch.trim());
    }
    
    // Sort query
    const srt = sortVal !== undefined ? sortVal : sort;
    if (srt && srt !== 'latest') {
      query.set('sort', srt);
    }
    
    // Page selection
    const pg = page !== undefined ? page : 1;
    if (pg > 1) {
      query.set('page', pg.toString());
    }
    
    const queryString = query.toString();
    return queryString ? `/blog?${queryString}` : '/blog';
  };

  const handleSortChange = async (newSort: string) => {
    setSort(newSort);
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set('search', search.trim());
      if (activeCategory !== 'all') queryParams.set('category', activeCategory);
      if (activeTag !== 'all') queryParams.set('tag', activeTag);
      if (newSort !== 'latest') queryParams.set('sort', newSort);
      queryParams.set('page', '1');
      queryParams.set('limit', '6');

      const res = await fetch(`/api/blog?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setPagination(data.pagination);

        // Update URL
        const urlString = queryParams.toString() ? `/blog?${queryParams.toString()}` : '/blog';
        window.history.replaceState(null, '', urlString);
      }
    } catch (err) {
      console.error('[ERROR] [BlogListClient] Sort change failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleClearSearch = () => {
    setSearch('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email) {
      setNewsletterError('لطفاً ایمیل خود را وارد کنید.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterError('فرمت ایمیل وارد شده معتبر نیست.');
      return;
    }

    setNewsletterError('');
    setSubmittingNewsletter(true);
    // Simulate API registration
    setTimeout(() => {
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
      setSubmittingNewsletter(false);
    }, 1200);
  };

  // Dynamic reading time (1 minute per 180 words)
  const calculateReadingTime = (htmlContent: string) => {
    const text = htmlContent.replace(/<[^>]*>/g, ''); // strip HTML tags
    const wordCount = text.trim().split(/\s+/).length;
    const time = Math.max(1, Math.ceil(wordCount / 180));
    return `${time} دقیقه`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNum = (num: number) => {
    return num.toLocaleString('fa-IR');
  };


  const activeCategoryName = initialCategories.find((c) => c.slug === activeCategory)?.name;

  // Key for the articles grid — changes only on filter navigation (not on live
  // search / infinite scroll) so the grid crossfades with a light transition
  // while the rest of the page stays in place.
  const gridKey = `${activeCategory}|${activeTag}|${activePage}|${activeSort}`;

  // Swipe logic for slider
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchStartEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      // Next slide
      setCurrentSlide((prev) => (prev + 1) % sliderPosts.length);
    } else if (isRightSwipe) {
      // Prev slide
      setCurrentSlide((prev) => (prev - 1 + sliderPosts.length) % sliderPosts.length);
    }
    setTouchStart(null);
    setTouchStartEnd(null);
  };

  // Slider navigation helpers (RTL aware)
  const goToSlide = (idx: number) => {
    if (sliderPosts.length <= 1) return;
    setCurrentSlide((idx + sliderPosts.length) % sliderPosts.length);
  };
  const nextSlide = () => goToSlide(currentSlide + 1);
  const prevSlide = () => goToSlide(currentSlide - 1);

  // Scroll the category tab bar by a fixed step (used by the edge arrow buttons)
  const scrollTabs = (dir: 'forward' | 'back') => {
    const el = tabsScrollRef.current;
    if (!el) return;
    // Positive delta moves toward the end of the list (visual left in RTL)
    el.scrollBy({ left: dir === 'forward' ? 240 : -240, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-12 select-none text-right" dir="rtl">
      
      {/* 1. Header & Minimal Search Bar Container */}
      <div className="flex flex-col items-center justify-center text-center space-y-6 pt-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 animate-pulse" />
            مجله خبری و آموزشی {shopName}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">آخرین مقالات و خواندنی‌ها</h1>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            در این بخش می‌توانید جدیدترین نقد و بررسی‌ها، اخبار روز بازار و آموزش‌های کاربردی ما را با چاشنی طراحی مینیمال بخوانید.
          </p>
        </div>

        {/* Minimal Real-time Search Box */}
        <div ref={searchContainerRef} className="relative w-full max-w-xl z-40">
          <form onSubmit={handleSearchSubmit} className="relative group">
            {/* Leading search icon / loading spinner (right side in RTL) */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {loading || suggestionsLoading ? (
                <span className="block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              )}
            </div>

            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="جستجو در بین مقالات، آموزش‌ها و اخبار..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowSuggestions(false);
                  searchInputRef.current?.blur();
                }
              }}
              className="w-full pr-11 pl-12 py-3.5 bg-gray-50/80 dark:bg-gray-900/80 border border-gray-200/70 dark:border-gray-800/70 rounded-2xl outline-none font-medium text-[13px] text-gray-800 dark:text-gray-100 placeholder:text-gray-400/80 shadow-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950 transition-all duration-200"
            />

            {/* Trailing area (left side in RTL): clear button or keyboard hint */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
              {search ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="پاک کردن جستجو"
                  className="p-1 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 text-[9px] font-bold text-gray-400 dark:text-gray-500 pointer-events-none">
                  ENTER
                </kbd>
              )}
            </div>
          </form>

          {/* Search suggestions dropdown panel */}
          {showSuggestions && search.trim().length >= 2 && (
            <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl shadow-2xl shadow-gray-900/10 dark:shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-[120]">
              {suggestionsLoading && searchSuggestions.length === 0 ? (
                <div className="p-6 flex flex-col items-center gap-2 text-center">
                  <span className="block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-[11px] font-medium text-gray-400">در حال جستجو...</span>
                </div>
              ) : searchSuggestions.length > 0 ? (
                <div>
                  <div className="px-3.5 pt-3 pb-1.5 flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">پیشنهادها</span>
                    <span className="text-[9px] font-bold text-gray-400">{formatNum(searchSuggestions.length)} مورد</span>
                  </div>
                  <div className="p-1.5 pt-0">
                    {searchSuggestions.map((post) => (
                      <Link
                        key={post.id}
                        href={`/blog/${post.slug}`}
                        onClick={() => setShowSuggestions(false)}
                        className="group/item flex items-center gap-3 p-2 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 rounded-xl transition-colors"
                      >
                        <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-800">
                          {post.featuredImage ? (
                            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                          ) : (
                            <BlogFallbackImage title={post.title} categoryName={post.category?.name} variant="thumbnail" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate leading-tight group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                            {post.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-400 font-medium">
                            {post.category && (
                              <span className="text-blue-600 dark:text-blue-400 font-bold">{post.category.name}</span>
                            )}
                            {post.category && <span>•</span>}
                            <span className="flex items-center gap-0.5">
                              <Eye className="w-2.5 h-2.5" />
                              {formatNum(post.viewCount)}
                            </span>
                            <span>•</span>
                            <span>{formatDate(post.publishedAt)}</span>
                          </div>
                        </div>
                        <ArrowLeft className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0 ml-1 group-hover/item:text-blue-500 group-hover/item:-translate-x-0.5 transition-all" />
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={getLinkUrl({ searchVal: search, page: 1 })}
                    onClick={() => setShowSuggestions(false)}
                    className="flex items-center justify-center gap-1.5 p-2.5 text-center bg-gray-50/70 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800 text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 transition-colors"
                  >
                    <Search className="w-3 h-3" />
                    نمایش همه نتایج برای «{search.trim()}»
                  </Link>
                </div>
              ) : (
                <div className="p-6 flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-600">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">هیچ مقاله‌ای پیدا نشد.</p>
                  <p className="text-[10px] font-medium text-gray-400">کلمه کلیدی دیگری را امتحان کنید.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Featured Posts Slider (standard blog hero carousel) */}
      {sliderPosts.length > 0 && (
        <section
          aria-label="اسلایدر مقالات ویژه"
          className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-xs hover:border-gray-200 dark:hover:border-gray-800/80 transition-colors duration-300"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => setSliderPaused(true)}
          onMouseLeave={() => setSliderPaused(false)}
        >
          {/* Slide Window */}
          <div className="relative w-full overflow-hidden h-56 xs:h-64 sm:h-72 md:h-80 lg:h-96">
            {sliderPosts.map((post, index) => {
              const isActive = index === currentSlide;
              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  aria-hidden={!isActive}
                  tabIndex={isActive ? 0 : -1}
                  className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out block ${
                    isActive ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 translate-x-4 pointer-events-none z-0'
                  }`}
                >
                  {/* Image as background */}
                  <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900">
                    {post.featuredImage ? (
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BlogFallbackImage title={post.title} categoryName={post.category?.name} variant="cover" />
                    )}
                  </div>

                  {/* Dark Gradient Overlay & Title */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex flex-col justify-end p-5 sm:p-8 text-right" dir="rtl">
                    <div className="space-y-1.5 sm:space-y-2.5 max-w-2xl">
                      {post.category && (
                        <span className="inline-block text-[9px] sm:text-[10px] text-white bg-blue-600 px-2.5 py-1 rounded-lg font-black border border-blue-500/25 shadow-sm">
                          {post.category.name}
                        </span>
                      )}

                      <h3 className="font-black text-sm sm:text-lg md:text-xl lg:text-2xl text-white hover:text-blue-400 transition-colors leading-tight drop-shadow-md line-clamp-2">
                        {post.title}
                      </h3>

                      <div className="flex items-center gap-3 text-[9px] sm:text-[10px] text-gray-300 font-bold drop-shadow-sm">
                        <span>{formatDate(post.publishedAt)}</span>
                        <span>•</span>
                        <span>زمان مطالعه: {calculateReadingTime(post.content)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Slide Counter (top-left in RTL) */}
          {sliderPosts.length > 1 && (
            <div className="absolute top-4 left-4 z-20 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-white text-[10px] font-black tracking-wide border border-white/10">
              {formatNum(currentSlide + 1)} / {formatNum(sliderPosts.length)}
            </div>
          )}

          {/* Arrow Controls (RTL: prev on the right, next on the left) */}
          {sliderPosts.length > 1 && (
            <>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); prevSlide(); }}
                aria-label="اسلاید قبلی"
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 grid place-items-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm border border-white/15 text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); nextSlide(); }}
                aria-label="اسلاید بعدی"
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 grid place-items-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm border border-white/15 text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Dot Indicators */}
          {sliderPosts.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
              {sliderPosts.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); goToSlide(idx); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'
                  }`}
                  aria-label={`اسلاید ${formatNum(idx + 1)}`}
                  aria-current={idx === currentSlide}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. Category Tab Bar (minimal segmented control, above the article list) */}
      <div className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-1.5 shadow-xs">
        <div
          ref={tabsScrollRef}
          className="flex items-center gap-1 overflow-x-auto scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          role="tablist"
          aria-label="دسته‌بندی مقالات"
        >
          {/* "All" tab */}
          <Link
            href={getLinkUrl({ category: 'all', page: 1, tag: 'all' })}
            scroll={false}
            role="tab"
            aria-selected={activeCategory === 'all' && activeTag === 'all'}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
              activeCategory === 'all' && activeTag === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            همه مطالب
          </Link>

          {/* Category tabs with post counts */}
          {initialCategories.map((cat) => {
            const isActive = activeCategory === cat.slug && activeTag === 'all';
            const count = cat?._count?.posts ?? 0;
            return (
              <Link
                key={cat.id}
                href={getLinkUrl({ category: cat.slug, page: 1, tag: 'all' })}
                scroll={false}
                role="tab"
                aria-selected={isActive}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {cat.name}
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}>
                  {formatNum(count)}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Edge scroll arrows (only when the bar overflows) — RTL: back on right, forward on left */}
        {tabsOverflow && (
          <>
            <button
              type="button"
              onClick={() => scrollTabs('back')}
              aria-label="اسکرایل به عقب"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 grid place-items-center w-7 h-7 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTabs('forward')}
              aria-label="اسکرایل به جلو"
              className="absolute left-0.5 top-1/2 -translate-y-1/2 z-10 grid place-items-center w-7 h-7 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* 3b. Tags row (secondary filter, only when tags exist) */}
      {initialPopularTags.length > 0 && (
        <div className="relative -mt-1">
          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scroll-smooth no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {initialPopularTags.map((tag) => (
              <Link
                key={tag.name}
                href={getLinkUrl({ tag: tag.name, page: 1, category: 'all' })}
                scroll={false}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap border transition-all duration-200 ${
                  activeTag === tag.name
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Selected Filters Info */}
      {(activeCategory !== 'all' || activeTag !== 'all' || activeSearch || sort !== 'latest') && (
        <div className="flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-900 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate">
            {activeCategory !== 'all' && `دسته‌بندی: ${activeCategoryName || activeCategory} `}
            {activeTag !== 'all' && `نمایش برچسب: #${activeTag} `}
            {activeSearch && `نتیجه جستجو برای: "${activeSearch}" `}
            {sort !== 'latest' && `مرتب‌سازی: ${sort === 'oldest' ? 'قدیمی‌ترین' : 'پربازدیدترین'} `}
          </span>
          <Link
            href="/blog"
            onClick={() => {
              setSort('latest');
              setSearch('');
            }}
            className="text-[10px] font-black text-rose-500 hover:text-rose-600 flex items-center gap-1 shrink-0"
          >
            پاک کردن فیلترها
          </Link>
        </div>
      )}

      {/* 4. Minimal Articles Feed */}
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 px-4 py-3 rounded-2xl shadow-xs">
          <div className="space-y-1">
            <h2 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-widest">فهرست آخرین مقالات</h2>
            <div className="text-[9px] font-bold text-gray-400">
              {posts.length > 0 ? (
                <span>نمایش <span className="font-black text-gray-700 dark:text-gray-200">{formatNum(posts.length)}</span> از <span className="font-black text-gray-500 dark:text-gray-400">{formatNum(pagination.total)}</span> مقاله</span>
              ) : (
                <span>بدون مقاله</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                <span>مرتب‌سازی: {sort === 'latest' ? 'جدیدترین' : sort === 'oldest' ? 'قدیمی‌ترین' : 'پربازدیدترین'}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
              
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                  <div className="absolute left-0 mt-1.5 w-36 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      onClick={() => {
                        handleSortChange('latest');
                        setSortOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-[10px] font-bold transition-colors flex items-center justify-between ${
                        sort === 'latest' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <span>جدیدترین</span>
                      <Calendar className="w-3 h-3 opacity-60" />
                    </button>
                    <button
                      onClick={() => {
                        handleSortChange('oldest');
                        setSortOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-[10px] font-bold transition-colors flex items-center justify-between ${
                        sort === 'oldest' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <span>قدیمی‌ترین</span>
                      <Clock className="w-3 h-3 opacity-60" />
                    </button>
                    <button
                      onClick={() => {
                        handleSortChange('popular');
                        setSortOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-[10px] font-bold transition-colors flex items-center justify-between ${
                        sort === 'popular' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <span>پربازدیدترین</span>
                      <TrendingUp className="w-3 h-3 opacity-60" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Layout Switcher (2 Column Grid vs List) */}
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-100 dark:border-gray-800">
              <button
                onClick={() => handleBlogLayoutChange('grid')}
                className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  isBlogGrid
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="نمای ۲ ستونه"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleBlogLayoutChange('list')}
                className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  !isBlogGrid
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="نمای لیستی"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {posts.length === 0 ? (
          <div key={gridKey} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl py-16 px-6 text-center flex flex-col items-center gap-3 animate-fade-in-up-css">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-600">
              <BookOpen className="w-7 h-7" />
            </div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">هیچ مقاله‌ای با فیلترهای مورد نظر پیدا نشد.</p>
            {(activeCategory !== 'all' || activeTag !== 'all' || activeSearch) && (
              <Link
                href="/blog"
                className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-black text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-4 py-2 rounded-xl transition-colors"
              >
                مشاهده همه مقالات
              </Link>
            )}
          </div>
        ) : (
          <div key={gridKey} className={`grid animate-fade-in-up-css ${
            isBlogGrid
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'
              : 'grid-cols-1 gap-4'
          }`}>
            {posts.map((post) => (
              <article 
                key={post.id} 
                className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 hover:-translate-y-0.5 transition-all duration-300 flex group ${
                  isBlogGrid ? 'flex-col justify-between' : 'flex-row items-stretch'
                }`}
              >
                {/* Article Thumbnail */}
                <Link 
                  href={`/blog/${post.slug}`} 
                  className={`relative block overflow-hidden bg-gray-50 dark:bg-gray-900 flex-shrink-0 ${
                    isBlogGrid 
                      ? 'aspect-[16/10] w-full border-b border-gray-100 dark:border-gray-800' 
                      : 'w-24 xs:w-32 sm:w-44 md:w-52 h-auto'
                  }`}
                >
                  {post.featuredImage ? (
                    <img 
                      src={post.featuredImage} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <BlogFallbackImage title={post.title} categoryName={post.category?.name} variant="card" />
                  )}
                </Link>

                {/* Article Info & content */}
                <div className={`flex-1 flex flex-col justify-between p-3.5 sm:p-5 ${
                  isBlogGrid ? 'space-y-2' : 'space-y-1.5 xs:space-y-3'
                } min-w-0 text-right`} dir="rtl">
                  <div className="space-y-1.5 sm:space-y-2.5">
                    {/* Top Meta */}
                    <div className="flex items-center gap-2 text-[8px] sm:text-[9px] text-gray-400 font-bold">
                      {post.category && (
                        <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg">
                          {post.category.name}
                        </span>
                      )}
                      <span>•</span>
                      <span>{formatDate(post.publishedAt)}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-xs sm:text-sm md:text-base text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                      <Link href={`/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h3>

                    {/* Excerpt */}
                    <p className={`text-[10px] xs:text-[11px] text-gray-500 dark:text-gray-400 font-normal leading-relaxed ${
                      isBlogGrid ? 'hidden sm:line-clamp-2' : 'line-clamp-1 xs:line-clamp-2'
                    }`}>
                      {post.summary || post.content.replace(/<[^>]*>/g, '').slice(0, 110) + '...'}
                    </p>
                  </div>

                  {/* Footer Area */}
                  <div className="pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="w-4 h-4 sm:w-5.5 sm:h-5.5 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden flex items-center justify-center border border-gray-200/50 dark:border-gray-800">
                        {post.author?.avatarUrl ? (
                          <img src={post.author.avatarUrl} alt={post.author.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[8px] font-bold text-gray-500">{post.author?.name ? post.author.name.slice(0, 1) : 'م'}</span>
                        )}
                      </div>
                      <span className="text-[8px] sm:text-[9.5px] text-gray-500 dark:text-gray-400 font-bold">{post.author?.name || 'مدیر سایت'}</span>
                    </div>

                    <span className="text-[8px] sm:text-[9.5px] text-gray-400 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                      {calculateReadingTime(post.content)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Infinite Scroll Loader / Trigger */}
      {pagination.page < pagination.totalPages && (
        <div ref={observerRef} className="flex justify-center items-center py-8">
          <div className="flex flex-col items-center gap-2">
            <span className="block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-[11px] font-medium text-gray-400">در حال بارگذاری مطالب بیشتر...</span>
          </div>
        </div>
      )}

      {pagination.page >= pagination.totalPages && pagination.totalPages > 1 && (
        <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-xs font-medium">
          همه مطالب بارگذاری شدند
        </div>
      )}

      {/* 5. Minimal Newsletter Subscription Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 dark:from-blue-900 dark:via-indigo-950 dark:to-purple-950 rounded-3xl p-6 sm:p-8 md:p-10 border border-blue-500/20 dark:border-blue-800/30 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/15 transition-all duration-300">
        {/* Decorative background glow */}
        <div className="absolute -right-12 -top-12 w-44 h-44 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-44 h-44 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5 text-center md:text-right max-w-md mx-auto md:mx-0">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <div className="p-2.5 bg-white/15 text-white rounded-2xl backdrop-blur-sm border border-white/10 shadow-sm">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">عضویت در خبرنامه مجله</h3>
            </div>
            <p className="text-[11px] sm:text-xs text-blue-100/90 leading-relaxed">
              هیچ مطلبی را از دست ندهید! جدیدترین مقالات، آموزش‌ها و اخبار بازار را مستقیم در ایمیل خود دریافت کنید.
            </p>
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-[10px] font-bold text-blue-100/70">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              ایمیل شما محفوظ است — هر زمان بخواهید لغو عضویت کنید.
            </div>
          </div>

          <div className="w-full md:w-auto md:min-w-[340px]">
            {newsletterSubscribed ? (
              <div className="bg-white/15 border border-white/25 px-5 py-4 rounded-2xl text-center backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                <p className="text-xs font-black text-white">عضویت شما با موفقیت ثبت شد!</p>
                <p className="text-[10px] font-medium text-blue-100/80">از این پس جدیدترین مطالب را برایتان ارسال می‌کنیم.</p>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 peer-focus:text-gray-400 pointer-events-none" />
                    <input 
                      type="email" 
                      dir="ltr"
                      placeholder="example@email.com"
                      value={newsletterEmail}
                      onChange={(e) => {
                        setNewsletterEmail(e.target.value);
                        if (newsletterError) setNewsletterError('');
                      }}
                      aria-invalid={!!newsletterError}
                      className={`peer w-full pr-10 pl-4 py-3 text-right bg-white/10 border outline-none rounded-xl text-xs text-white placeholder:text-white/40 focus:ring-4 focus:ring-white/10 focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 transition-all shadow-inner ${
                        newsletterError ? 'border-rose-300/80 ring-2 ring-rose-400/30' : 'border-white/15 focus:border-white/40'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingNewsletter}
                    className="flex items-center justify-center gap-1.5 px-6 py-3 bg-white hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-black duration-300 transition-all shadow-md hover:shadow-lg hover:shadow-white/10 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none whitespace-nowrap"
                  >
                    {submittingNewsletter ? (
                      <>
                        <span className="block w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        در حال ثبت
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        عضویت
                      </>
                    )}
                  </button>
                </div>
                {newsletterError && (
                  <p className="text-[10px] font-bold text-rose-100 bg-rose-500/20 border border-rose-300/30 rounded-lg px-3 py-1.5 text-center animate-in fade-in slide-in-from-top-1 duration-200">
                    {newsletterError}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
