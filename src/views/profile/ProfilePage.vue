<template>
  <BgLayout>
  <StatusBar />
  <div class="my-layout">

    <div class="my-header">
      <div class="my-profile">
        <div class="my-avatar">
          <span class="my-avatar-text">{{ sessionUsername.slice(0, 1).toUpperCase() }}</span>
        </div>
        <div class="my-user-info">
          <div class="my-username">{{ sessionUsername }}</div>
          <div class="my-user-desc">Explore every corner of the world</div>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="my-stats">
      <div class="my-stat-item" v-for="stat in statsList" :key="stat.label">
        <div class="my-stat-value">{{ stat.value }}</div>
        <div class="my-stat-label">{{ stat.label }}</div>
      </div>
    </div>

    <!-- Menu -->
    <div class="my-menu">
      <div class="my-menu-item" v-for="item in menuList" :key="item.id">
        <div class="my-menu-left">
          <span class="my-menu-icon">{{ item.icon }}</span>
          <span class="my-menu-text">{{ item.text }}</span>
        </div>
        <span class="my-menu-arrow">›</span>
      </div>
    </div>

    <!-- Extra Menu -->
    <div class="my-menu">
      <div class="my-menu-item" v-for="item in extraMenu" :key="item.id">
        <div class="my-menu-left">
          <span class="my-menu-icon">{{ item.icon }}</span>
          <span class="my-menu-text">{{ item.text }}</span>
        </div>
        <span class="my-menu-arrow">›</span>
      </div>
    </div>

    <!-- Bottom spacer -->
    <button class="my-menu-item my-menu" @click="logout">退出登录</button>
    <div class="my-bottom-space"></div>
  </div>
  </BgLayout>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import BgLayout from '@/components/layout/BgLayout.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import { clearSession, sessionUsername } from '@/stores/session'
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'ProfilePage',
  components: { BgLayout, StatusBar },
  setup() {
    const router = useRouter()
    const logout = () => {
      clearSession()
      router.replace('/login')
    }
    return { sessionUsername, logout }
  },
  data() {
    return {
      statsList: [
        { value: '12', label: 'Footprints' },
        { value: '8', label: 'Saved' },
        { value: '3', label: 'Stories' },
      ],
      menuList: [
        { id: 1, icon: '📋', text: 'My Orders' },
        { id: 2, icon: '❤️', text: 'Favorites' },
        { id: 3, icon: '📝', text: 'My Stories' },
        { id: 4, icon: '👥', text: 'Travel Companions' },
      ],
      extraMenu: [
        { id: 1, icon: '⚙️', text: 'Settings' },
        { id: 2, icon: '❓', text: 'Help Center' },
      ],
    }
  },
})
</script>

<style scoped>
.my-layout {
  min-height: 100vh;
}

/* Header */
.my-header {
  position: relative;
  padding: 48px 24px 0px;
  overflow: hidden;
}

.my-profile {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
}

.my-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
}

.my-avatar-text {
  font-size: 24px;
  color: #fff;
  font-weight: 700;
}

.my-user-info {
  flex: 1;
}

.my-username {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.my-user-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
}

/* Stats */
.my-stats {
  display: flex;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  margin:  16px;
  border-radius: 20px;
  padding: 12px 0;
  position: relative;
  z-index: 2;
  box-shadow: 0 8px 32px rgba(155, 109, 255, 0.08);
}

.my-stat-item {
  flex: 1;
  text-align: center;
}

.my-stat-item + .my-stat-item {
  border-left: 1px solid #F3F4F6;
}

.my-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #9b6dff;
}

.my-stat-label {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 4px;
}

/* Menu */
.my-menu {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  margin: 0 16px 16px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(155, 109, 255, 0.08);
}

.my-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  transition: background-color 0.15s ease;
}

.my-menu-item:active {
  background-color: #f9f9f9;
}

.my-menu-item + .my-menu-item {
  border-top: 1px solid #F3F4F6;
}

.my-menu-left {
  display: flex;
  align-items: center;
}

.my-menu-icon {
  font-size: 20px;
  margin-right: 12px;
}

.my-menu-text {
  font-size: 15px;
  color: #374151;
}

.my-menu-arrow {
  font-size: 18px;
  color: #D1D5DB;
  font-weight: 300;
}

.my-bottom-space {
  height: 72px;
}
</style>
