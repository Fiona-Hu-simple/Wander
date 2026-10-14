<template>
  <div class="status-bar">
    <div class="status-bar-left">
      <span class="status-time">{{ currentTime }}</span>
    </div>
    <div class="status-bar-right">
      <!-- Signal bars -->
      <svg class="status-icon" viewBox="0 0 24 24" fill="currentColor">
        <rect x="1" y="16" width="3" height="6" rx="0.5" opacity="1"/>
        <rect x="6" y="12" width="3" height="10" rx="0.5" opacity="1"/>
        <rect x="11" y="8" width="3" height="14" rx="0.5" opacity="1"/>
        <rect x="16" y="4" width="3" height="18" rx="0.5" opacity="0.9"/>
      </svg>
      <!-- WiFi -->
      <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
        <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <circle cx="12" cy="20" r="1" fill="currentColor"/>
      </svg>
      <!-- Battery -->
      <div class="status-battery">
        <div class="battery-body">
          <div class="battery-level"></div>
        </div>
        <div class="battery-tip"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'

export default defineComponent({
  name: 'StatusBar',
  setup() {
    const currentTime = ref('')
    let timer: ReturnType<typeof setInterval>

    const updateTime = () => {
      const now = new Date()
      const h = now.getHours().toString().padStart(2, '0')
      const m = now.getMinutes().toString().padStart(2, '0')
      currentTime.value = `${h}:${m}`
    }

    const start = () => {
      clearInterval(timer)
      updateTime()
      timer = setInterval(updateTime, 1000)
    }
    onMounted(start)
    onActivated(start)
    onDeactivated(() => clearInterval(timer))

    onUnmounted(() => {
      clearInterval(timer)
    })

    return { currentTime }
  },
})
</script>

<style scoped>
.status-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 99999;
  background: transparent;
  pointer-events: none;
  user-select: none;
}

.status-bar-left,
.status-bar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 80px;
}

.status-bar-right {
  justify-content: flex-end;
}


.status-time {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  letter-spacing: 0.5px;
  text-shadow: 0 0.5px 1px rgba(255, 255, 255, 0.5);
}

.status-icon {
  width: 18px;
  height: 18px;
  color: #1a1a2e;
}

/* Battery */
.status-battery {
  display: flex;
  align-items: center;
  gap: 1px;
}

.battery-body {
  width: 24px;
  height: 12px;
  border: 1.8px solid #1a1a2e;
  border-radius: 3px;
  padding: 1.5px;
  position: relative;
}

.battery-level {
  width: 80%;
  height: 100%;
  background: #34c759;
  border-radius: 1px;
}

.battery-tip {
  width: 2px;
  height: 5px;
  background: #1a1a2e;
  border-radius: 0 1px 1px 0;
}
</style>
