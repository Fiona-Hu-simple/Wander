<template>
  <BgLayout>
    <StatusBar />
    <div>
      <div class="home-header">
          <div class="home-greeting-text">Explore</div>
          <div class="home-greeting-sub">Discover the world, starting now</div>
      </div>
      <TripList />
      <TripMap />
      <div class="home-bottom-space"></div>
    </div>
  </BgLayout>
</template>

<script lang="ts">
import BgLayout from '@/components/layout/BgLayout.vue';
import StatusBar from '@/components/layout/StatusBar.vue'
import TripList from '@/components/journey/TripList.vue';
import TripMap from '@/components/journey/TripMap.vue';
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'JourneyPage',
  components: { BgLayout, StatusBar , TripList,TripMap},
})
</script>

<style scoped>
.home-header {
  position: relative;
  padding: 48px 24px 0px;
}

.home-greeting-text {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.home-greeting-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.home-bottom-space {
  height: 72px;
}
</style>
