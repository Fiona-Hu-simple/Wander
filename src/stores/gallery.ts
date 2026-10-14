import { computed, ref, watch } from 'vue'
import { sessionUserId } from './session'
import { galleryRegions } from '@/data/gallery-regions'
import type { GalleryAlbum } from '@/types/gallery'

const customAlbums = ref<GalleryAlbum[]>([])
const storageKey = () => `wander_albums:${sessionUserId.value}`

watch(sessionUserId, userId => {
  customAlbums.value = []
  if (!userId) return
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey()) || '[]')
    if (!Array.isArray(saved)) return
    const ids = new Set<string>()
    for (const item of saved) {
      if (!item || typeof item.id !== 'string' || !/^album-[\w-]+$/.test(item.id) || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 40 || typeof item.desc !== 'string' || !item.desc.trim() || item.desc.length > 200) continue
      ids.add(item.id)
      customAlbums.value.push({ id: item.id, name: item.name, desc: item.desc, route: '/picture/sanya', image: null, placeholder: '📷' })
    }
  } catch { /* 损坏的本地数据不影响默认相册展示。 */ }
}, { immediate: true, flush: 'sync' })

export const galleryAlbums = computed(() => [...galleryRegions, ...customAlbums.value])

export function createGalleryAlbum(name: string, desc: string) {
  name = name.trim()
  desc = desc.trim()
  if (!sessionUserId.value) throw new Error('请先登录')
  if (!name || name.length > 40) throw new Error('请输入 1–40 个字符的相册名称')
  if (!desc || desc.length > 200) throw new Error('请输入 1–200 个字符的简介')
  if (galleryAlbums.value.some(album => album.name.toLowerCase() === name.toLowerCase())) throw new Error('该相册名称已存在，请换一个名称')
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  const album: GalleryAlbum = { id: `album-${id}`, name, desc, route: '/picture/sanya', image: null, placeholder: '📷' }
  const albums = [...customAlbums.value, album]
  try { localStorage.setItem(storageKey(), JSON.stringify(albums)) }
  catch { throw new Error('相册无法保存，请检查浏览器存储空间后重试') }
  customAlbums.value = albums
  return album
}
