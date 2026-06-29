export interface BannerConfig {
  enabled: boolean;
  text: string;
  link?: string;
  bgColor?: string;
  textColor?: string;
  gifUrl?: string;
  bgType?: 'solid' | 'gradient';
  tagText?: string;
  tagBgColor?: string;
  tagTextColor?: string;
  underlineImportant?: boolean;
  tagAnimated?: boolean;
  tagWithCheck?: boolean;
}

export interface HeaderConfig {
  showCategories: boolean;
  showSearch: boolean;
  showCart: boolean;
  showUser: boolean;
  showBlog?: boolean;
  showShop?: boolean;
  showAboutUs?: boolean;
  showContactUs?: boolean;
  sticky?: boolean;
  elementsOrder: string[];
  banner?: BannerConfig;
}

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  showCategories: false,
  showSearch: true,
  showCart: true,
  showUser: true,
  showBlog: true,
  showShop: false,
  showAboutUs: false,
  showContactUs: false,
  sticky: true,
  elementsOrder: ['logo', 'categories', 'menu', 'shop', 'blog', 'about_us', 'contact_us', 'search', 'cart', 'user'],
  banner: {
    enabled: false,
    text: '',
    link: '',
    bgColor: '#4f46e5',
    textColor: '#ffffff',
    gifUrl: '',
    bgType: 'gradient',
    tagText: '',
    tagBgColor: '#ef4444',
    tagTextColor: '#ffffff',
    underlineImportant: true,
    tagAnimated: true,
    tagWithCheck: true,
  },
};

export const BANNER_TEXT_MAX_LENGTH = 100;

export function parseHeaderConfig(raw: string | null | undefined): HeaderConfig {
  if (!raw) return DEFAULT_HEADER_CONFIG;

  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_HEADER_CONFIG,
      ...parsed,
      banner: {
        ...DEFAULT_HEADER_CONFIG.banner!,
        ...(parsed.banner || {}),
      },
    };
  } catch {
    return DEFAULT_HEADER_CONFIG;
  }
}
