<template>
  <div class="tabbar">
    <router-link
      v-for="tab in tabs"
      :key="tab.name"
      :to="{ name: tab.routeName }"
      class="tabbar-item"
      :class="{ active: isActive(tab.path) }"
    >
      <div class="tabbar-icon">
        <svg v-if="tab.name === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <svg v-else-if="tab.name === 'jour'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <svg v-else-if="tab.name === 'picture'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <svg v-else-if="tab.name === 'my'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <span class="tabbar-label">{{ tab.label }}</span>
    </router-link>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useRoute } from 'vue-router'

export default defineComponent({
  name: 'Tabbar',
  setup() {
    const route = useRoute()

    const tabs = [
      { name: 'home', routeName: 'Home', path: '/home', label: 'Home' },
      { name: 'jour', routeName: 'Jour', path: '/jour', label: 'Journey' },
      { name: 'picture', routeName: 'Picture', path: '/picture', label: 'Gallery' },
      { name: 'my', routeName: 'My', path: '/my', label: 'Me' },
    ]

    const isActive = (path: string) => {
      return route.path === path || (path === '/home' && route.path === '/')
    }

    return { tabs, isActive }
  },
})
</script>

<style scoped>
.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 9999;
  padding-bottom: env(safe-area-inset-bottom, 0);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.04);
}

.tabbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  text-decoration: none;
  color: #9CA3AF;
  transition: all 0.25s ease;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.tabbar-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 32px;
  height: 3px;
  background: linear-gradient(135deg, #9b6dff, #6d88ff);
  border-radius: 0 0 3px 3px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tabbar-item.active::before {
  transform: translateX(-50%) scaleX(1);
}

.tabbar-item.active {
  color: #9b6dff;
}

.tabbar-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 2px;
  transition: transform 0.25s ease;
}

.tabbar-item.active .tabbar-icon {
  transform: scale(1.1);
}

.tabbar-icon svg {
  width: 100%;
  height: 100%;
}

.tabbar-item.active .tabbar-icon svg {
  stroke: #9b6dff;
  fill: rgba(155, 109, 255, 0.1);
}

.tabbar-label {
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
  transition: color 0.25s ease;
}

.tabbar-item.active .tabbar-label {
  font-weight: 600;
  color: #9b6dff;
}
</style>
