<template>
  <div v-if="navigationError" class="navigation-error" role="alert">
    {{ navigationError }} <button type="button" @click="reloadPage">刷新</button>
  </div>
  <router-view v-slot="{ Component }">
    <keep-alive :key="sessionUserId" :exclude="['LoginPage', 'RegisterPage']">
      <component :is="Component" />
    </keep-alive>
  </router-view>
  <Tabbar v-if="showTabbar" />
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useRoute } from 'vue-router'
import Tabbar from './components/layout/Tabbar.vue'
import { sessionUserId } from './stores/session'
import { navigationError } from './router/navigation'

export default defineComponent({
  name: 'App',
  components: { Tabbar },
  setup() {
    const route = useRoute()
    const showTabbar = computed(() => !route.meta.hideTabbar)
    const reloadPage = () => window.location.reload()
    return { showTabbar, sessionUserId, navigationError, reloadPage }
  },
})
</script>

<style scoped>
.navigation-error {
  position: fixed;
  top: 40px;
  left: 16px;
  right: 16px;
  z-index: 100000;
  padding: 12px;
  border-radius: 12px;
  color: #933c4f;
  background: #fff1f4;
  box-shadow: 0 4px 16px #0002;
  font-size: 14px;
}
.navigation-error button { margin-left: 8px; cursor: pointer; }
</style>
