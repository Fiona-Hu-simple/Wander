<template>
    <div class="jour-layout">
    <router-link to="map" class="jour-map-section">
        <div class="map-header">
            <div class="map-title">My Travel Map</div>
            <div class="map-stats">12 cities explored</div>
        </div>
        <div class="map-content">
            <img src="@/assets/images/jour/jour-wodelvyouditu.png" class="map-img">
        </div>
    </router-link>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'

export default defineComponent({
  name: 'TripMap',
})

</script>
<style scoped>
.jour-layout {
  margin:0px;
  padding: 0px 16px;
  display: flex;
  flex-direction: column;
}
/* Travel Map Unit */
.jour-map-section {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 24px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 15px 40px rgba(186, 171, 218, 0.15);
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.map-title {
  font-size: 18px;
  font-weight: 700;
  color: #4a3d6e;
}

.map-stats {
  font-size: 14px;
  color: #baabda;
  font-weight: 600;
}

.map-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
}
</style>