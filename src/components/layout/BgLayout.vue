<template>
  <section class="bg-layout">
    <div class="bg-color"></div>
    <div class="bg-color"></div>
    <div class="bg-color"></div>
    <div class="bg-layout-content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.bg-layout {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(to bottom, #f1f4f9, #dff1ff);
  overflow: hidden;
}

.bg-color {
  position: absolute;
  filter: blur(150px);
  pointer-events: none;
}

.bg-color:nth-child(1) {
  top: -350px;
  width: 600px;
  height: 600px;
  background: #ff359b;
}

.bg-color:nth-child(2) {
  bottom: -150px;
  left: 100px;
  width: 500px;
  height: 500px;
  background: #fffd87;
}

.bg-color:nth-child(3) {
  bottom: 50px;
  right: 100px;
  width: 500px;
  height: 500px;
  background: #00d2ff;
}

.bg-layout-content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
}
</style>