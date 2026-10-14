import { createRouter, createWebHistory } from 'vue-router'
import { installAuthGuard } from './guards'
import { installRouteRecovery } from './navigation'

// 页面按需加载；URL 和路由名称保持兼容。
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/login', component: () => import('@/views/auth/LoginPage.vue'), name: 'Login', meta: { hideTabbar: true } },
    { path: '/register', component: () => import('@/views/auth/RegisterPage.vue'), name: 'Register', meta: { hideTabbar: true } },
    { path: '/home', component: () => import('@/views/chat/ChatPage.vue'), name: 'Home', meta: { requiresAuth: true } },
    { path: '/jour', component: () => import('@/views/journey/JourneyPage.vue'), name: 'Jour', meta: { requiresAuth: true } },
    { path: '/picture', component: () => import('@/views/gallery/GalleryPage.vue'), name: 'Picture', meta: { requiresAuth: true } },
    { path: '/my', component: () => import('@/views/profile/ProfilePage.vue'), name: 'My', meta: { requiresAuth: true } },
    { path: '/map', component: () => import('@/views/map/MapPage.vue'), name: 'Map', meta: { requiresAuth: true, hideTabbar: true } },
    { path: '/mytravel', component: () => import('@/views/journey/TripDetailPage.vue'), name: 'MyTravel', meta: { requiresAuth: true, hideTabbar: true } },
    { path: '/picture/sanya', component: () => import('@/views/gallery/RegionGalleryPage.vue'), name: 'Sanya', meta: { requiresAuth: true, hideTabbar: true } },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
})

installAuthGuard(router)
installRouteRecovery(router)
export default router
