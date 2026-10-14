<template>
  <BgLayout>
    <StatusBar />
    <section class="login-section">
      <div class="container">
        <!-- 五个漂浮方块 -->
        <div class="square" style="--i:0;"></div>
        <div class="square" style="--i:1;"></div>
        <div class="square" style="--i:2;"></div>
        <div class="square" style="--i:3;"></div>
        <div class="square" style="--i:4;"></div>
        <div class="form">
          <h2>Login Form</h2>
          <form @submit.prevent="handleLogin">
            <div class="inputBox">
              <input type="text" v-model="username" placeholder="Username" autocomplete="username" maxlength="20" required>
            </div>
            <div class="inputBox">
              <input type="password" v-model="password" placeholder="Password" autocomplete="current-password" required>
            </div>
            <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
            <div class="inputBox">
              <input type="submit" :value="loading ? 'Logging in...' : 'Login'" :disabled="loading">
            </div>
            <p class="forget">Don't have an account ? <router-link to="/register">Sign up</router-link></p>
          </form>
        </div>
      </div>
    </section>
  </BgLayout>
</template>

<script lang="ts">
import { defineComponent, ref, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { saveSession } from '@/stores/session'
import BgLayout from '@/components/layout/BgLayout.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import { loginApi } from '@/api/auth'
import { getApiErrorMessage } from '@/utils/api-error'

export default defineComponent({
  name: 'LoginPage',
  components: { BgLayout, StatusBar },
  setup() {
    let active = true
    onUnmounted(() => { active = false })
    const router = useRouter()
    const route = useRoute()
    const username = ref('')
    const password = ref('')
    const errorMsg = ref(route.query.error === 'verification' ? '无法连接服务器验证登录状态，请稍后重试' : '')
    const loading = ref(false)

    const handleLogin = async () => {
      if (loading.value) return
      errorMsg.value = ''

      if (!username.value.trim()) {
        errorMsg.value = '请输入用户名'
        return
      }
      if (!password.value) {
        errorMsg.value = '请输入密码'
        return
      }

      loading.value = true
      try {
        const res = await loginApi(username.value.trim(), password.value)
        if (!active) return
        const { token, userId, username: name } = res.data.data
        // 存储认证信息
        saveSession({ token, userId, username: name })
        // 跳转到首页
        const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/home'
        const resolved = router.resolve(target)
        await router.replace(resolved.meta.requiresAuth ? resolved.fullPath : '/home')
      } catch (error: unknown) {
        if (!active) return
        errorMsg.value = getApiErrorMessage(error, '登录失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }

    return { username, password, errorMsg, loading, handleLogin }
  },
})
</script>

<style scoped>
.login-section {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
}



.container {
  position: relative;
  width: 80%;
  max-width: 320px;
  min-height: 400px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 25px 45px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

/* 漂浮方块 */
.container .square {
  pointer-events: none;
  position: absolute;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 25px 45px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  animation: animate 10s linear infinite;
  animation-delay: calc(-1s * var(--i));
}

@keyframes animate {
  0%, 100% {
    transform: translateY(-40px);
  }
  50% {
    transform: translate(40px);
  }
}

.container .square:nth-child(1) {
  top: -25px;
  right: -25px;
  width: 100px;
  height: 100px;
}

.container .square:nth-child(2) {
  top: 70px;
  left: -35px;
  width: 120px;
  height: 120px;
  z-index: 2;
}

.container .square:nth-child(3) {
  bottom: 20px;
  right: -30px;
  width: 80px;
  height: 80px;
  z-index: 2;
}

.container .square:nth-child(4) {
  bottom: -30px;
  left: 40px;
  width: 50px;
  height: 50px;
}

.container .square:nth-child(5) {
  top: -35px;
  left: 50px;
  width: 60px;
  height: 60px;
}

.form {
  position: relative;
  width: 100%;
  padding: 30px 20px;
}

.form h2 {
  position: relative;
  color: #fff;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 1px;
  margin-bottom: 40px;
}

.form h2::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: -10px;
  width: 80px;
  height: 4px;
  background: #fff;
}

.form .inputBox {
  width: 100%;
  margin-top: 20px;
}

.form .inputBox input {
  width: 100%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  outline: none;
  padding: 12px 20px;
  border-radius: 35px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 16px;
  letter-spacing: 1px;
  color: #fff;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  direction: ltr;
  text-align: left;
  unicode-bidi: normal;
}

.form .inputBox input::placeholder {
  color: #fff;
}

.form .inputBox input[type="submit"] {
  background: #fff;
  color: #666;
  max-width: 100px;
  cursor: pointer;
  font-weight: 600;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.form .inputBox input[type="submit"]:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.form .inputBox input[type="submit"]:active {
  transform: scale(0.97);
}

.form .inputBox input[type="submit"]:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-msg {
  color: #ff6b6b;
  font-size: 13px;
  margin-top: 10px;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.forget {
  margin-top: 12px;
  color: #fff;
  font-size: 14px;
}

.forget a {
  color: #fff;
  font-weight: 600;
}

/* 小屏幕微调 */
@media (max-width: 480px) {
  .container {
    width: 85%;
    max-width: 280px;
    min-height: 380px;
  }
  .form {
    padding: 24px 16px;
  }
  .form h2 {
    font-size: 22px;
    margin-bottom: 32px;
  }
  .form .inputBox input {
    padding: 10px 16px;
    font-size: 14px;
  }
  .container .square:nth-child(1) { top: -20px; right: -20px; width: 80px; height: 80px; }
  .container .square:nth-child(2) { top: 60px; left: -120px; width: 100px; height: 100px; }
  .container .square:nth-child(3) { bottom: 15px; right: -25px; width: 70px; height: 70px; }
  .container .square:nth-child(4) { bottom: -50px; left: 30px; width: 45px; height: 45px; }
  .container .square:nth-child(5) { top: -60px; left: 40px; width: 60px; height: 60px; }
}
</style>
