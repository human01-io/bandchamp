export type WishlistPriority = 'low' | 'medium' | 'high';

export interface WishlistItem {
  id: string;
  albumId: string;
  priority: WishlistPriority;
  notes?: string;
  targetPrice?: number;
  currentPrice?: number;
  lastCheckedAt?: string;
  addedAt: string;
}
