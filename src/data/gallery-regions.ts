// 列表和详情共用目的地信息，避免两处展示内容不一致。
import type { GalleryAlbum } from '@/types/gallery'

export const galleryRegions: GalleryAlbum[] = [
  { id: 1, name: 'Sanya', desc: 'Sunshine, beaches, coconut breezes', route: '/picture/sanya', image: null, placeholder: '☀️' },
  { id: 2, name: 'Bali', desc: 'Tropical paradise & sacred temples', route: '/picture/sanya', image: null, placeholder: '🇮🇩' },
  { id: 3, name: 'Iceland', desc: 'Northern lights & volcanic landscapes', route: '/picture/sanya', image: null, placeholder: '🇮🇸' },
  { id: 4, name: 'Machu Picchu', desc: 'Ancient Incan citadel in the clouds', route: '/picture/sanya', image: null, placeholder: '🇵🇪' },
  { id: 5, name: 'Dubai', desc: 'Futuristic skyline & desert adventures', route: '/picture/sanya', image: null, placeholder: '🇦🇪' },
]
