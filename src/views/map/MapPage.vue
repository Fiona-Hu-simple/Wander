<template>
  <BgLayout>
    <StatusBar />
    <div class="map-page">
      <!-- 头部 -->
      <div class="map-header">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="map-header-title">My Travel Map</div>
        <div class="map-header-stats">{{ visitedPlaces.length }} places visited</div>
      </div>

      <!-- 地图容器 -->
      <div id="leaflet-map" class="map-container"></div>

      <!-- 底部已访问地点列表 -->
      <div class="places-panel">
        <div class="places-header">
          <div class="places-title">Visited Places</div>
          <button class="add-place-btn" @click="openAddModal" title="添加地点">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        <div class="places-list">
          <div class="place-item" v-for="place in visitedPlaces" :key="place.name"
               @click="flyToPlace(place)">
            <div class="place-icon">{{ place.icon }}</div>
            <div class="place-info">
              <div class="place-name">{{ place.name }}</div>
              <div class="place-date">{{ place.date }}</div>
            </div>
            <button class="place-badge" @click.stop="removePlace(place)" title="删除">✓</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增地点弹窗 -->
    <transition name="modal-fade">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal-dialog">
          <div class="modal-title">添加新地点</div>
          <div class="modal-body">
            <!-- 地点搜索 -->
            <div class="modal-field search-field">
              <label>搜索地点</label>
              <input v-model="searchQuery" @input="onSearchInput" placeholder="输入城市或地点名..." autocomplete="off" />
              <div v-if="isSearching" class="search-loading">搜索中...</div>
              <!-- 搜索结果下拉 -->
              <div v-if="searchResults.length > 0" class="search-dropdown">
                <div class="search-result-item" v-for="result in searchResults" :key="result.place_id"
                     @click="selectPlace(result)">
                  <div class="result-name">{{ result.displayName }}</div>
                  <div class="result-detail">{{ result.displayDetail }}</div>
                </div>
              </div>
            </div>
            <!-- 选中的地点信息 -->
            <div v-if="newPlace.name" class="selected-place-info">
              <span class="selected-tag">📍 {{ newPlace.name }}</span>
              <span class="selected-coords">{{ newPlace.lat.toFixed(4) }}, {{ newPlace.lng.toFixed(4) }}</span>
            </div>
            <div class="modal-field">
              <label>图标 (Emoji)</label>
              <input v-model="newPlace.icon" placeholder="例如：🗼" maxlength="4" />
            </div>
            <div class="modal-field">
              <label>旅行日期</label>
              <input v-model="newPlace.date" placeholder="例如：2024.08.01 - 08.05" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn modal-btn-cancel" @click="showAddModal = false">取消</button>
            <button class="modal-btn modal-btn-confirm" @click="confirmAddPlace" :disabled="!newPlace.name || !Number.isFinite(newPlace.lat) || !Number.isFinite(newPlace.lng) || visitedPlaces.some(p => p.name === newPlace.name)">确认</button>
          </div>
        </div>
      </div>
    </transition>
  </BgLayout>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, onActivated, onDeactivated, ref, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import BgLayout from '@/components/layout/BgLayout.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import L from 'leaflet'
import DOMPurify from 'dompurify'
import 'leaflet/dist/leaflet.css'

interface VisitedPlace {
  name: string
  icon: string
  lat: number
  lng: number
  date: string
  color: string
}

const COLORS = ['#9b6dff', '#ff6dab', '#00d2ff', '#ffbd59', '#51cf66', '#f06595', '#ff922b', '#845ef7', '#20c997', '#fcc419']

export default defineComponent({
  name: 'MapPage',
  components: { BgLayout, StatusBar },
  setup() {
    const router = useRouter()
    let map: L.Map | null = null
    const markerMap = new Map<string, L.Marker>()

    const visitedPlaces = ref<VisitedPlace[]>([
      { name: 'Beijing', icon: '🏛️', lat: 39.9042, lng: 116.4074, date: '2024.02.15 - 02.18', color: '#9b6dff' },
      { name: 'Zhangjiajie', icon: '🏔️', lat: 29.1170, lng: 110.4793, date: '2024.03.01 - 03.05', color: '#ff6dab' },
      { name: 'Hangzhou', icon: '🌸', lat: 30.2741, lng: 120.1551, date: '2024.04.05 - 04.07', color: '#00d2ff' },
      { name: 'Shanghai', icon: '🌃', lat: 31.2304, lng: 121.4737, date: '2024.05.10 - 05.14', color: '#ffbd59' },
      { name: 'Chengdu', icon: '🐼', lat: 30.5728, lng: 104.0668, date: '2024.06.20 - 06.25', color: '#51cf66' },
      { name: 'Xi\'an', icon: '⚔️', lat: 34.3416, lng: 108.9398, date: '2024.07.08 - 07.12', color: '#f06595' },
    ])

    // 新增地点弹窗
    const showAddModal = ref(false)
    const newPlace = reactive({
      name: '',
      icon: '📍',
      lat: NaN,
      lng: NaN,
      date: '',
    })

    const goBack = () => router.back()

    const flyToPlace = (place: VisitedPlace) => {
      if (map) map.flyTo([place.lat, place.lng], 8, { duration: 1.5 })
    }

    // 在地图上添加单个标记
    const addMarkerToMap = (place: VisitedPlace) => {
      if (!map) return
      const icon = L.divIcon({
        className: 'custom-marker',
        html: DOMPurify.sanitize(`
          <div class="marker-pulse" style="--color: ${place.color}"></div>
          <div class="marker-dot" style="background: ${place.color}">
            <span class="marker-emoji">${place.icon}</span>
          </div>
        `),
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })
      const marker = L.marker([place.lat, place.lng], { icon }).addTo(map)
      marker.bindPopup(DOMPurify.sanitize(`
        <div style="text-align:center;font-family:inherit;">
          <div style="font-size:24px;margin-bottom:4px;">${place.icon}</div>
          <div style="font-weight:700;font-size:15px;color:#253c5c;">${place.name}</div>
          <div style="font-size:12px;color:#9CA3AF;margin-top:2px;">${place.date}</div>
        </div>
      `), { className: 'custom-popup', closeButton: false })
      markerMap.set(place.name, marker)
    }

    // 删除地点
    const removePlace = (place: VisitedPlace) => {
      const marker = markerMap.get(place.name)
      if (marker && map) {
        map.removeLayer(marker)
        markerMap.delete(place.name)
      }
      const idx = visitedPlaces.value.findIndex(p => p.name === place.name)
      if (idx !== -1) visitedPlaces.value.splice(idx, 1)
    }

    // 地点搜索相关
    interface SearchResult {
      place_id: number
      displayName: string
      displayDetail: string
      lat: number
      lng: number
    }

    const searchQuery = ref('')
    const searchResults = ref<SearchResult[]>([])
    const isSearching = ref(false)
    let searchTimer: ReturnType<typeof setTimeout> | null = null
    let searchController: AbortController | null = null

    const onSearchInput = () => {
      // 清除之前的定时器（防抖 400ms）
      if (searchTimer) clearTimeout(searchTimer)
      searchController?.abort()
      searchController = null
      newPlace.name = ''
      newPlace.lat = NaN
      newPlace.lng = NaN
      searchResults.value = []
      if (!searchQuery.value.trim()) {
        isSearching.value = false
        return
      }
      isSearching.value = true
      searchTimer = setTimeout(() => searchPlaces(searchQuery.value.trim()), 400)
    }

    const searchPlaces = async (query: string) => {
      const controller = new AbortController()
      searchController = controller
      isSearching.value = true
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&accept-language=zh,en`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error('搜索服务暂时不可用')
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error('无效的搜索结果')
        if (controller.signal.aborted || query !== searchQuery.value.trim()) return
        searchResults.value = data.map((item: any) => {
          const parts = (item.display_name || '').split(',')
          return {
            place_id: item.place_id,
            displayName: parts[0]?.trim() || query,
            displayDetail: parts.slice(1, 3).join(',').trim(),
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }
        }).filter((p: SearchResult) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180)
      } catch (e) {
        if (controller.signal.aborted) return
        console.error('搜索失败:', e)
        searchResults.value = []
      } finally {
        if (searchController === controller) isSearching.value = false
      }
    }

    const selectPlace = (result: SearchResult) => {
      newPlace.name = result.displayName
      newPlace.lat = result.lat
      newPlace.lng = result.lng
      searchQuery.value = result.displayName
      searchResults.value = []
    }

    // 打开新增弹窗
    const openAddModal = () => {
      stopSearch()
      newPlace.name = ''
      newPlace.icon = '📍'
      newPlace.lat = NaN
      newPlace.lng = NaN
      newPlace.date = ''
      searchQuery.value = ''
      searchResults.value = []
      showAddModal.value = true
    }

    // 确认新增
    const confirmAddPlace = () => {
      if (!newPlace.name || !Number.isFinite(newPlace.lat) || !Number.isFinite(newPlace.lng) || Math.abs(newPlace.lat) > 90 || Math.abs(newPlace.lng) > 180) return
      if (visitedPlaces.value.some(p => p.name === newPlace.name)) return
      const color = COLORS[visitedPlaces.value.length % COLORS.length]|| '#9b6dff'
      const place: VisitedPlace = {
        name: newPlace.name,
        icon: newPlace.icon || '📍',
        lat: newPlace.lat,
        lng: newPlace.lng,
        date: newPlace.date || 'N/A',
        color,
      }
      visitedPlaces.value.push(place)
      addMarkerToMap(place)
      showAddModal.value = false
      nextTick(() => {
        if (map) map.flyTo([place.lat, place.lng], 6, { duration: 1.5 })
      })
    }

    const initMap = () => {
      map = L.map('leaflet-map', {
        center: [35, 105],
        zoom: 4,
        zoomControl: false,
        attributionControl: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      visitedPlaces.value.forEach(addMarkerToMap)

      if (visitedPlaces.value.length > 0) {
        const bounds = L.latLngBounds(visitedPlaces.value.map(p => [p.lat, p.lng] as L.LatLngTuple))
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }

    const stopSearch = () => {
      if (searchTimer) clearTimeout(searchTimer)
      searchController?.abort()
      isSearching.value = false
    }
    onMounted(() => initMap())
    onActivated(() => nextTick(() => map?.invalidateSize()))
    onDeactivated(stopSearch)
    onUnmounted(() => {
      stopSearch()
      map?.remove()
      markerMap.clear()
      map = null
    })

    return {
      visitedPlaces, goBack, flyToPlace, removePlace,
      showAddModal, newPlace, openAddModal, confirmAddPlace,
      searchQuery, searchResults, isSearching, onSearchInput, selectPlace,
    }
  },
})
</script>

<style scoped>
.map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  z-index: 1;
}

/* Header */
.map-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 52px 20px 14px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn svg {
  width: 20px;
  height: 20px;
  color: #3d406e;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.55);
}

.map-header-title {
  font-size: 18px;
  font-weight: 700;
  color: #253c5c;
}

.map-header-stats {
  margin-left: auto;
  font-size: 13px;
  color: #687b9f;
  font-weight: 600;
}

/* Map Container */
.map-container {
  flex: 1;
  min-height: 0;
}

/* Places Panel */
.places-panel {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.5);
  padding: 12px 24px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  max-height: 35vh;
  overflow-y: auto;
  flex-shrink: 0;
}

.places-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.places-title {
  font-size: 20px;
  font-weight: 700;
  color: #253c5c;
}

.add-place-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #aab9ff, hsl(335, 100%, 86%));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 3px 10px rgba(155, 109, 255, 0.3);
}

.add-place-btn svg {
  width: 16px;
  height: 16px;
  color: #fff;
}

.add-place-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 5px 14px rgba(155, 109, 255, 0.4);
}

.add-place-btn:active {
  transform: scale(0.95);
}

.places-list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.places-list::-webkit-scrollbar {
  display: none;
}

.place-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;
  min-width: 160px;
}

.place-item:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(155, 109, 255, 0.12);
}

.place-item:active {
  transform: scale(0.97);
}

.place-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.place-info {
  flex: 1;
  min-width: 0;
}

.place-name {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.place-date {
  font-size: 11px;
  color: #9CA3AF;
  margin-top: 2px;
  white-space: nowrap;
}

.place-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd0df, #eba8bd);
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.place-badge:hover {
  background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
  transform: scale(1.15);
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-dialog {
  width: 88%;
  max-width: 340px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  padding: 22px;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #253c5c;
  margin-bottom: 16px;
  text-align: center;
}

.modal-body {
  margin-bottom: 18px;
}

.modal-field {
  margin-bottom: 12px;
  flex: 1;
}

.modal-field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #6B7280;
  margin-bottom: 4px;
}

.modal-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(155, 109, 255, 0.25);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  color: #374151;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.modal-field input:focus {
  border-color: #9b6dff;
  box-shadow: 0 0 0 2px rgba(155, 109, 255, 0.1);
}

.modal-field input::placeholder {
  color: #9CA3AF;
}

.modal-row {
  display: flex;
  gap: 10px;
}

/* Search autocomplete */
.search-field {
  position: relative;
}

.search-loading {
  font-size: 12px;
  color: #9CA3AF;
  padding: 6px 0 0;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(155, 109, 255, 0.2);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 4px;
}

.search-result-item {
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: rgba(155, 109, 255, 0.08);
}

.result-name {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.result-detail {
  font-size: 11px;
  color: #9CA3AF;
  margin-top: 2px;
}

.selected-place-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(155, 109, 255, 0.08), rgba(255, 109, 171, 0.06));
  border: 1px solid rgba(155, 109, 255, 0.15);
  border-radius: 10px;
  margin-bottom: 12px;
}

.selected-tag {
  font-size: 13px;
  font-weight: 600;
  color: #7c5ce9;
}

.selected-coords {
  font-size: 11px;
  color: #9CA3AF;
  font-family: monospace;
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.modal-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: 12px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.modal-btn-cancel {
  background: rgba(0, 0, 0, 0.06);
  color: #6B7280;
}

.modal-btn-cancel:hover {
  background: rgba(0, 0, 0, 0.1);
}

.modal-btn-confirm {
  background: linear-gradient(135deg, #9b6dff, #ff6dab);
  color: #fff;
  box-shadow: 0 4px 12px rgba(155, 109, 255, 0.3);
}

.modal-btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(155, 109, 255, 0.4);
}

.modal-btn-confirm:active {
  transform: scale(0.97);
}

.modal-btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Modal transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-active .modal-dialog,
.modal-fade-leave-active .modal-dialog {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .modal-dialog {
  transform: scale(0.9) translateY(10px);
}
.modal-fade-leave-to .modal-dialog {
  transform: scale(0.95);
}
</style>

<style>
/* Leaflet custom marker styles (unscoped) */
.custom-marker {
  background: none !important;
  border: none !important;
}

.marker-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 2;
}

.marker-emoji {
  font-size: 16px;
  filter: brightness(1.1);
}

.marker-pulse {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color);
  opacity: 0.3;
  animation: marker-pulse-anim 2s ease-out infinite;
  z-index: 1;
}

@keyframes marker-pulse-anim {
  0% { transform: scale(1); opacity: 0.3; }
  100% { transform: scale(2.2); opacity: 0; }
}

/* Custom popup */
.custom-popup .leaflet-popup-content-wrapper {
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  padding: 6px;
}

.custom-popup .leaflet-popup-tip {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
