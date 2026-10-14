<template>
    <div class="jour-layout">

      <div class="title">Itinerary</div> 

      <!-- 分类标签 -->
      <div class="jour-tabs">
        <div 
          v-for="item in jourCardList" 
          :key="item.id" 
          class="tab-item"
          :class="{ active: item.id === activeTabId }"
          @click="activeTabId = item.id">
          {{ item.text }}
        </div>
      </div>

      <!-- 行程卡片横向滚动 -->
      <div class="jour-travelexp">
        <div class="exp-card-wrapper" v-for="item in filteredTrips" :key="item.id">
          <router-link v-if="item.id === 1" :to="{ name: 'MyTravel' }" class="exp-card">
            <img :src="item.image" class="exp-img" />
            <div class="exp-info">
              <div class="exp-title">{{ item.text }}</div>
              <div class="exp-meta">
              <img src="@/assets/images/jour/jour-clock.png" class="clock-icon" />
                {{ item.dataRange }}
              </div>
              <div class="exp-progress">
                <div class="progress-bar"></div>
              </div>
            </div>
          </router-link>
          <div v-else class="exp-card">
            <img :src="item.image" class="exp-img" />
            <div class="exp-info">
              <div class="exp-title">{{ item.text }}</div>
              <div class="exp-meta">
                <img src="@/assets/images/jour/jour-clock.png" class="clock-icon" />
                {{ item.dataRange }}
              </div>
              <div class="exp-progress">
                <div class="progress-bar"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 更多 -->
      <div class="jour-view-more">more ›</div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'


import jourBeijing from '@/assets/images/jour/jour-beijingwenhuazhilv.png'
import jourZJJ from '@/assets/images/jour/jour-zhangjiajieboliqiao.png'
import jourHZXH from '@/assets/images/jour/jour-hangzhouxihu.png'

export default defineComponent({
  name: 'TripList',

  setup() {
    const activeTabId = ref(1)
    const jourCardList = [
      { id: 1, text: 'All Trips' },
      { id: 2, text: 'Upcoming' },
      { id: 3, text: 'Completed' },
    ]
    const jourtwoList = [
      {
        id: 1,
        text: 'Beijing Cultural Tour',
        image: jourBeijing,
        dataRange: '2024.02.15 - 02.18',
        status: 'upcoming',
      },
      {
        id: 2,
        text: 'Zhangjiajie Glass Bridge',
        image: jourZJJ,
        dataRange: '2024.03.01 - 03.05',
        status: 'upcoming',
      },
      {
        id: 3,
        text: 'Hangzhou West Lake',
        image: jourHZXH,
        dataRange: '2024.04.05 - 04.07',
        status: 'completed',
      },
    ]

    // 根据当前选中的标签筛选行程
    const filteredTrips = computed(() => {
      if (activeTabId.value === 1) return jourtwoList        // All Trips
      if (activeTabId.value === 2) return jourtwoList.filter(t => t.status === 'upcoming')
      if (activeTabId.value === 3) return jourtwoList.filter(t => t.status === 'completed')
      return jourtwoList
    })

    return { 
      activeTabId, 
      jourCardList, 
      filteredTrips,
    }
  },
})
</script>

<style scoped>
.jour-layout {
  margin:0px;
  padding: 0px 24px;
  display: flex;
  flex-direction: column;
}

.title{
  position: relative;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

/* Tabs */
.jour-tabs {
  position: relative;
  top:8px;
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.tab-item {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 0.5rem;
  font-size: 12px;
  color: #9a8bc5;
  transition: all 0.3s ease;
}

.tab-item.active {
  background: linear-gradient(135deg, #91defe 0%, #bdb6ec 50%, #f9bccc 100%);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 6px 16px rgba(186, 171, 218, 0.4);
}

/* Experience Cards (Horizontal Scroll) */
.jour-travelexp {
  display: flex;
  overflow-x: auto;
  gap: 16px;
  padding-bottom: 4px;
  margin: 0;
  scrollbar-width: none;
}

.jour-travelexp::-webkit-scrollbar {
  display: none;
}

.exp-card {
  width: 220px;
  height: 220px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 10px 30px rgba(186, 171, 218, 0.2);
  text-decoration: none;
  display: block;
  flex-shrink: 0;
}

.exp-img {
  width: 100%;
  height: 130px;
  object-fit: cover;
}

.exp-info {
  padding: 8px;
}

.exp-title {
  font-size: 16px;
  font-weight: 700;
  color: #4a3d6e;
  margin-bottom: 8px;
}

.exp-meta {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #9a8bc5;
  margin-bottom: 4px;
}

.clock-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  opacity: 0.7;
}

.exp-progress {
  height: 4px;
  background: rgba(186, 171, 218, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  width: 65%;
  height: 100%;
  background: linear-gradient(to right, #91defe, #f9bccc);
  border-radius: 3px;
}

/* View More */
.jour-view-more {
  text-align: right;
  margin: 0px 0 16px;
  font-size: 14px;
  color: #baabda;
  font-weight: 500;
}  
</style>
