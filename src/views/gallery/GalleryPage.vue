<template>
  <div class="picture-layout">
    <StatusBar />
    <div class="picture-header">
      <h1 class="picture-title">Gallery</h1>
      <button
        class="add-btn"
        type="button"
        aria-label="新增相册"
        :class="{ 'is-bouncing': btnBouncing }"
        @click="onAddClick"
      ></button>
    </div>
    <p v-if="createdMessage" class="created-message" role="status">{{ createdMessage }}</p>
    <div class="travel-pictures">
      <button
        class="travel-card"
        type="button"
        v-for="item in travelList"
        :key="item.id"
        @click="goToRegion(item)"
      >
        <div class="travel-card-info">
          <div class="travel-card-name">{{ item.name }}</div>
          <div class="travel-card-desc">{{ item.desc }}</div>
        </div>
        <div class="travel-card-image">
          <img v-if="item.image" :src="item.image" :alt="item.name" />
          <div v-else class="travel-card-placeholder">
            <span>{{ item.placeholder }}</span>
          </div>
        </div>
      </button>
    </div>
    <div class="picture-bottom-space"></div>
    <dialog ref="albumDialog" class="album-dialog" aria-labelledby="album-dialog-title" @cancel.prevent="closeDialog" @click.self="closeDialog">
      <form @submit.prevent="submitAlbum" class="album-form">
        <h2 id="album-dialog-title">新增相册</h2>
        <label for="album-name">相册名称</label>
        <input id="album-name" ref="nameInput" v-model="albumName" maxlength="40" placeholder="例如：夏日旅行" autocomplete="off" required />
        <label for="album-description">简介</label>
        <textarea id="album-description" v-model="albumDescription" maxlength="200" rows="3" placeholder="写下这个相册的故事…" required></textarea>
        <p v-if="albumError" class="album-error" role="alert">{{ albumError }}</p>
        <div class="album-actions">
          <button type="button" @click="closeDialog">取消</button>
          <button type="submit" class="create-album-btn">创建相册</button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, nextTick, onUnmounted, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import StatusBar from '@/components/layout/StatusBar.vue'
import { galleryAlbums, createGalleryAlbum } from '@/stores/gallery'
import type { GalleryAlbum } from '@/types/gallery'

export default defineComponent({
  name: 'GalleryPage',
  components: { StatusBar },
  setup() {
    const router = useRouter()
    const albumDialog = ref<HTMLDialogElement | null>(null)
    const nameInput = ref<HTMLInputElement | null>(null)
    const albumName = ref('')
    const albumDescription = ref('')
    const albumError = ref('')
    const createdMessage = ref('')
    const closeDialog = () => albumDialog.value?.close()
    onDeactivated(closeDialog)
    onUnmounted(closeDialog)

    const btnBouncing = ref(false)
    let bounceTimer: ReturnType<typeof setTimeout> | undefined
    const stopBounce = () => { clearTimeout(bounceTimer); btnBouncing.value = false }
    onUnmounted(stopBounce)
    onDeactivated(stopBounce)

    const travelList = galleryAlbums

    const goToRegion = (item: GalleryAlbum) => {
      router.push({ name: 'Sanya', query: { album: String(item.id) } })
    }

    const onAddClick = () => {
      albumName.value = ''
      albumDescription.value = ''
      albumError.value = ''
      createdMessage.value = ''
      if (!albumDialog.value?.open) albumDialog.value?.showModal()
      nextTick(() => nameInput.value?.focus())
      btnBouncing.value = true
      clearTimeout(bounceTimer)
      bounceTimer = setTimeout(() => {
        btnBouncing.value = false
      }, 500)
    }

    const submitAlbum = () => {
      albumError.value = ''
      try {
        const album = createGalleryAlbum(albumName.value, albumDescription.value)
        closeDialog()
        createdMessage.value = `已创建「${album.name}」，点击相册即可添加照片`
      } catch (error) {
        albumError.value = error instanceof Error ? error.message : '创建失败，请重试'
      }
    }

    return { travelList, goToRegion, onAddClick, btnBouncing, albumDialog, nameInput, albumName, albumDescription, albumError, createdMessage, closeDialog, submitAlbum }
  },
})
</script>

<style scoped>
.picture-layout {
  min-height: 100vh;
  background: #fbedff;
  padding-top: 2rem;
  padding-bottom: 4rem;
}

.picture-header {
  padding: 16px 24px 8px;
  height: 80px;
}

.picture-title {
  position: relative;
  left: 16px;
  top: 8px;
  font-size: 32px;
  font-weight: 700;
  color: #a19ad4;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* ===== Add Button ===== */
.add-btn {
  position: fixed;
  top: 56px;
  right: 40px;
  z-index: 9999;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background-image: linear-gradient(to bottom right,
    #91defe,
    #99c0f9,
    #bdb6ec,
    #d7b3e3,
    #efb3d5,
    #f9bccc
  );
  cursor: pointer;
  will-change: transform;
  transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
}

/* Click bounce animation */
.add-btn.is-bouncing {
  animation: clickBounce 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
}

@keyframes clickBounce {
  0%   { transform: scale(1); }
  30%  { transform: scale(0.7); }
  60%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}

/* Cross icon */
.add-btn::before,
.add-btn::after {
  content: '';
  position: absolute;
  background-color: #ffffff;
  border-radius: 2px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.add-btn::before {
  width: 30px;
  height: 3px;
}

.add-btn::after {
  width: 3px;
  height: 30px;
}

/* ===== Travel Cards ===== */
.travel-pictures {
  width: 90%;
  margin: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.travel-card {
  width: 100%;
  font-family: inherit;
  text-align: left;
  display: flex;
  height: 120px;
  align-items: center;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 4px 16px rgba(186, 171, 218, 0.18);
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1),
              box-shadow 0.25s ease;
  border: 1px solid rgba(255, 255, 255, 0.6);
  overflow: hidden;
}

.travel-card:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 8px 28px rgba(186, 171, 218, 0.28);
}

.travel-card:active {
  transform: scale(0.98);
}

.travel-card-info {
  flex: 1;
  min-width: 0;
  padding: 20px 24px;
}

.travel-card-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
  font-weight: 700;
  color: #4a3d6e;
  margin-bottom: 6px;
}

.travel-card-desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  font-size: 13px;
  color: #9a8bc5;
  line-height: 1.4;
}

.travel-card-image {
  width: 140px;
  height: 100%;
  flex-shrink: 0;
  overflow: hidden;
}

.travel-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.travel-card-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    rgba(145, 222, 254, 0.15),
    rgba(189, 182, 236, 0.15),
    rgba(249, 188, 204, 0.15)
  );
  font-size: 42px;
}

.picture-bottom-space {
  height: 72px;
}

.created-message { margin: 16px 24px 0; color: #6b5688; font-size: 14px; }
.album-dialog {
  width: min(90vw, 400px);
  max-height: 85dvh;
  margin: auto;
  border: 0;
  border-radius: 20px;
  padding: 24px;
  color: #4a3d6e;
  background: #fff8ff;
  box-shadow: 0 16px 50px #30204633;
  overflow-y: auto;
}
.album-dialog::backdrop { background: #30204666; backdrop-filter: blur(4px); }
.album-form { display: flex; flex-direction: column; gap: 12px; }
.album-form h2 { margin-bottom: 8px; font-size: 22px; }
.album-form label { font-size: 14px; }
.album-form input, .album-form textarea {
  width: 100%; border: 1px solid #d8cce8; border-radius: 10px; padding: 12px;
  font: inherit; font-size: 16px; color: #4a3d6e; background: #fff; resize: vertical;
}
.album-form input:focus, .album-form textarea:focus { outline: 2px solid #a19ad4; outline-offset: 2px; }
.album-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
.album-actions button { border: 0; border-radius: 10px; padding: 10px 18px; font: inherit; cursor: pointer; }
.create-album-btn { color: #fff; background: #8d7ac0; }
.album-error { color: #b64056; font-size: 13px; }
@media (max-width: 480px) {
  .travel-pictures { width: auto; margin: 24px 16px; }
  .travel-card-info { padding: 16px; }
  .travel-card-image { width: 96px; }
}
</style>
