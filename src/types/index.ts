export interface Story {
  id: string;
  shop_id: string;
  title: string;
  thumbnailUrl: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  text?: string;
  linkUrl?: string;
  linkText?: string;
  duration?: number; // in seconds
  category?: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  displayLocation?: string;
}
