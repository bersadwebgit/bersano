import { prisma } from '@/lib/prisma';

const INDUSTRY_FALLBACK_IMAGES: Record<string, string[]> = {
  cosmetics: [
    'https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg', // Skincare bottle
    'https://images.pexels.com/photos/3785147/pexels-photo-3785147.jpeg', // Cream jar
    'https://images.pexels.com/photos/3618606/pexels-photo-3618606.jpeg'  // Lip gloss
  ],
  clothing: [
    'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg',   // Clothing rack
    'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg', // Linen shirt
    'https://images.pexels.com/photos/1126993/pexels-photo-1126993.jpeg'  // Fashion aesthetic
  ],
  electronics: [
    'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg', // Headphones
    'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg',   // Smart watch
    'https://images.pexels.com/photos/5082579/pexels-photo-5082579.jpeg'  // Modern gadget
  ],
  coffee: [
    'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',   // Coffee cup
    'https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg',   // Coffee beans bag
    'https://images.pexels.com/photos/4264049/pexels-photo-4264049.jpeg'  // French press
  ],
  home: [
    'https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg', // Home interior
    'https://images.pexels.com/photos/3754300/pexels-photo-3754300.jpeg', // Scented candle
    'https://images.pexels.com/photos/1125136/pexels-photo-1125136.jpeg'  // Ceramic plates
  ],
  jewelry: [
    'https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg', // Silver necklace
    'https://images.pexels.com/photos/1453008/pexels-photo-1453008.jpeg',   // Stack of rings
    'https://images.pexels.com/photos/2849742/pexels-photo-2849742.jpeg'    // Hoop earrings
  ],
  books: [
    'https://images.pexels.com/photos/262508/pexels-photo-262508.jpeg',   // Books stack
    'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg', // Open book
    'https://images.pexels.com/photos/2908984/pexels-photo-2908984.jpeg'  // Audiobook/reading
  ],
  sports: [
    'https://images.pexels.com/photos/414029/pexels-photo-414029.jpeg',   // Yoga mat
    'https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg',   // Workout shaker
    'https://images.pexels.com/photos/4753996/pexels-photo-4753996.jpeg'  // Gym flatlay
  ],
  kids: [
    'https://images.pexels.com/photos/35537/child-children-girl-happy.jpg', // Happy child
    'https://images.pexels.com/photos/1648377/pexels-photo-1648377.jpeg', // Baby romper
    'https://images.pexels.com/photos/1005012/pexels-photo-1005012.jpeg'  // Wooden toy
  ],
  health: [
    'https://images.pexels.com/photos/405082/pexels-photo-405082.jpeg',   // Herbal tea
    'https://images.pexels.com/photos/375889/pexels-photo-375889.jpeg',   // Essential oil dropper
    'https://images.pexels.com/photos/5946973/pexels-photo-5946973.jpeg'  // Organic honey jar
  ]
};

const GENERAL_FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/5632346/pexels-photo-5632346.jpeg', // Shopping
  'https://images.pexels.com/photos/113335/pexels-photo-113335.jpeg',   // Sale
  'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg'  // Office/work
];

/**
 * Searches Pexels for a given query.
 * If API key is missing or search fails, returns a high-quality fallback image based on the industry.
 */
export async function getSeedImage(query: string, industry: string): Promise<string> {
  try {
    const pexelsSetting = await prisma.systemSetting.findUnique({
      where: { key: 'pexels_api_key' }
    });
    const pexelsApiKey = pexelsSetting?.value || '';

    if (pexelsApiKey) {
      const cleanQuery = query.replace(/[_-]/g, ' ');
      const encodedQuery = encodeURIComponent(cleanQuery);
      const url = `https://api.pexels.com/v1/search?query=${encodedQuery}&per_page=5`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': pexelsApiKey,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const photos = data.photos || [];
        if (photos.length > 0) {
          const index = Math.min(Math.floor(Math.random() * photos.length), photos.length - 1);
          const photo = photos[index];
          const bestUrl = photo.src?.portrait || photo.src?.large || photo.src?.original;
          if (bestUrl) {
            return bestUrl;
          }
        }
      }
    }
  } catch (error) {
    console.error('[getSeedImage] Error calling Pexels API, falling back to static images:', error);
  }

  // Fallback to industry-specific images
  const normalizedIndustry = industry?.toLowerCase() || 'general';
  const fallbackList = INDUSTRY_FALLBACK_IMAGES[normalizedIndustry] || GENERAL_FALLBACK_IMAGES;
  const randomIndex = Math.floor(Math.random() * fallbackList.length);
  return fallbackList[randomIndex];
}
