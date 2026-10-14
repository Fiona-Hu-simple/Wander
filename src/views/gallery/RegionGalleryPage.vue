<template>
  <div class="sanya-layout">
    <div class="sanya-header">
      <button class="back-btn" @click="goBack">‹</button>
      <h1 class="sanya-title">{{ region.name }}</h1>
      <p class="sanya-subtitle">{{ region.desc }}</p>
    </div>
    <p class="upload-tip">点击卡片从相册添加照片，点击照片可更换</p>
    <p v-if="uploading" class="upload-status" role="status">正在读取照片…</p>
    <p v-if="errorMsg" class="upload-error" role="alert">{{ errorMsg }}</p>
    <input
      ref="photoInput"
      class="photo-input"
      type="file"
      accept="image/*"
      aria-label="选择相册照片"
      @change="handlePhotoSelected"
    />
    <PhotoGrid :cardList="sanyaCards" :uploading="uploading" @select-photo="selectPhoto" />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PhotoGrid from '@/components/gallery/PhotoGrid.vue'
import { galleryAlbums } from '@/stores/gallery'
import type { PhotoCard } from '@/types/gallery'

export default defineComponent({
  name: 'RegionGalleryPage',
  components: { PhotoGrid },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const region = computed(() => galleryAlbums.value.find(r => String(r.id) === route.query.album) || galleryAlbums.value.find(r => r.name === route.query.region) || galleryAlbums.value[0]!)
    const photoInput = ref<HTMLInputElement | null>(null)
    const photos = ref<Record<string, Record<number, string>>>({})
    const uploading = ref(false)
    const errorMsg = ref('')
    let selectedSlot: { region: string; id: number } | null = null
    let active = true

    const selectPhoto = (id: number) => {
      if (uploading.value) return
      errorMsg.value = ''
      selectedSlot = { region: String(region.value.id), id }
      photoInput.value?.click()
    }

    const handlePhotoSelected = async (event: Event) => {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      const slot = selectedSlot
      input.value = ''
      selectedSlot = null
      if (!file || !slot || uploading.value) return
      if (!file.type.startsWith('image/')) {
        errorMsg.value = '请选择照片文件'
        return
      }
      if (file.size > 20 * 1024 * 1024) {
        errorMsg.value = '照片过大，请选择不超过 20 MB 的照片'
        return
      }
      uploading.value = true
      const url = URL.createObjectURL(file)
      try {
        const image = new Image()
        image.src = url
        await image.decode()
        if (!active) {
          URL.revokeObjectURL(url)
          return
        }
        const album = photos.value[slot.region] ||= {}
        const previous = album[slot.id]
        album[slot.id] = url
        if (previous) URL.revokeObjectURL(previous)
      } catch {
        URL.revokeObjectURL(url)
        if (active) errorMsg.value = '无法读取这张照片，请尝试 JPG、PNG 或其他浏览器支持的图片'
      } finally {
        uploading.value = false
      }
    }

    onUnmounted(() => {
      active = false
      for (const album of Object.values(photos.value)) {
        for (const url of Object.values(album)) URL.revokeObjectURL(url)
      }
    })

    const sanyaCards = computed<PhotoCard[]>(() => Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      text: `${region.value.name}照片 ${i + 1}`,
      image: photos.value[String(region.value.id)]?.[i + 1] || null,
    })))

    const goBack = () => {
      router.back()
    }

    return { sanyaCards, goBack, region, photoInput, uploading, errorMsg, selectPhoto, handlePhotoSelected }
  },
})
</script>

<style scoped>
.sanya-layout {
  min-height: 100vh;
  background: linear-gradient(180deg, #e0f7fa 0%, #fbedff 40%, #fbedff 100%);
  padding-top: 1rem;
  padding-bottom: 4rem;
}

.photo-input {
  display: none;
}

.upload-tip,
.upload-status,
.upload-error {
  text-align: center;
  padding: 0 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #766590;
}

.upload-error {
  color: #b64056;
}

.sanya-header {
  position: relative;
  padding: 16px 24px 20px;
  text-align: center;
}

.back-btn {
  position: absolute;
  left: 20px;
  top: 18px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-size: 24px;
  color: #4a3d6e;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, background 0.2s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.back-btn:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.9);
}

.back-btn:active {
  transform: scale(0.95);
}

.sanya-title {
  font-size: 28px;
  font-weight: 700;
  color: #4a3d6e;
  margin: 0;
  letter-spacing: 2px;
}

.sanya-subtitle {
  font-size: 14px;
  color: #9a8bc5;
  margin-top: 6px;
  letter-spacing: 1px;
}
</style>
