<template>
  <div class="pictures-container">
    <div class="cards">
      <button
        class="card"
        :class="{ 'has-photo': item.image }"
        v-for="item in cardList"
        :key="item.id"
        type="button"
        :disabled="uploading"
        :aria-label="item.image ? `更换${item.text}` : `添加${item.text}`"
        @click="$emit('select-photo', item.id)"
      >
        <img v-if="item.image" :src="item.image" :alt="item.text" />
        <span v-if="item.image" class="replace-hint">更换照片</span>
        <span v-else class="upload-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m4 17 5-5 4 4 3-3 4 4" />
          </svg>
          <span>添加照片</span>
          <span class="upload-plus" aria-hidden="true">+</span>
        </span>
      </button>
    </div>
    <div class="picture-bottom-space"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { PhotoCard } from '@/types/gallery'

export default defineComponent({
  name: 'PhotoGrid',
  emits: {
    'select-photo': (id: number) => Number.isInteger(id),
  },
  props: {
    uploading: { type: Boolean, default: false },
    cardList: {
      type: Array as PropType<PhotoCard[]>,
      required: true,
    },
  },
})
</script>

<style scoped>
@keyframes slide-fade-in {
  from {
    opacity: 0;
    box-shadow: none;
    transform: scale(.8) translateY(15vh);
  }
}

.pictures-container {
  width: 100%;
}

.cards {
  display: grid;
  gap: 1rem;
  grid-auto-flow: dense;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 120px), 1fr));
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.card {
  position: relative;
  border: 2px dashed rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-family: inherit;
  animation: slide-fade-in both;
  animation-timeline: view();
  animation-range: contain 0% contain 50%;
  border-radius: 10px;
  box-shadow: 0px 8px 20px #00000022;
  font-size: clamp(18px, 5vw, 32px);
  letter-spacing: 2px;
  color: #fff;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background-image: linear-gradient(to bottom right,
      #91defe,
      #99c0f9,
      #bdb6ec,
      #d7b3e3,
      #efb3d5,
      #f9bccc);
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 0;
}

.card:focus-visible {
  outline: 3px solid #7564be;
  outline-offset: 4px;
}

.card:disabled {
  cursor: wait;
  opacity: 0.65;
}

.card.has-photo {
  border: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  font-size: 14px;
  letter-spacing: 0;
}

.upload-placeholder svg {
  width: 32px;
  height: 32px;
}

.upload-plus {
  font-size: 22px;
  line-height: 1;
}

.replace-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 7px;
  background: rgba(0, 0, 0, 0.35);
  font-size: 12px;
  letter-spacing: 0;
}

.card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 平板以上布局 */
@media (min-width: 768px) {
  .cards {
    gap: 2rem;
  }

  .card {
    letter-spacing: 5px;
  }

  .card:nth-of-type(4n) {
    grid-column: span 2;
  }

  .card:nth-of-type(5n) {
    grid-column: span 2;
  }

  .card:nth-of-type(7n) {
    grid-row: span 2;
  }
}

.picture-bottom-space {
  height: 72px;
}
</style>
