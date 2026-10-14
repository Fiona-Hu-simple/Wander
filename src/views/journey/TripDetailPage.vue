<template>
  <div class="mytravel-app-container">

    <div class="mytravel-header">
      <router-link :to="'/jour'" class="mytravel-back">
        <img src="@/assets/icons/mytravel/mytravel-fanhuijiantou.png" alt="图标" class="mytravel-back">
      </router-link>
      <h1 class="mytravel-title">My Travel</h1>
      <img src="@/assets/icons/mytravel/mytravel-fenxiang.png" alt="图标" class="mytravel-share">
    </div>

    <div class="mytravel-card">
      <img src="@/assets/images/mytravel/mytravel-beijingwenhuazhilv.png" alt="北京之旅" class="mytravel-img">
      <div class="mytravel-info">
        <h2 class="mytravel-title-beijing">Beijing Travel</h2>
        <p class="mytravel-date">2024.02.15 - 02.18</p>
        <div class="mytravel-buttons">
          <div class="mytravel-preview-btn">Preview</div>
          <div class="mytravel-edit-btn">Edit</div>
        </div>
      </div>
    </div>


    <div class="mytravel-progress-info">
      <img src="@/assets/icons/mytravel/mytravel-dingwei.png" alt="图标" class="mytravel-定位">
      <span>Current:Palace</span>
      <img src="@/assets/icons/mytravel/mytravel-time.png" alt="图标" class="mytravel-time">
      <span>30Mins</span>
    </div>

    <div class="mytravel-progress-bar-wrapper">
      <div class="mytravel-progress-bar-bg">
        <div class="mytravel-progress-bar-fill"></div>
      </div>
      <div class="mytravel-next-stop">Next stop:Shichahai(2km)</div>
    </div>




    <div class="mytravel-filter-scroll">
    <div class="mytravel-filter-buttons">
    <button
      v-for="tag in tags"
      :key="tag.label"
      :class="['mytravel-filter-btn', tag.active ? 'active' : '']">
      <img :src="tag.img" alt="" class="mytravel-btn-icon" />
      <span>{{ tag.label }}</span>
    </button>
  </div>
</div>



    <!-- 推荐路线 -->
    <div class="mytravel-section">
      <h2 class="mytravel-section-title">Recommended Routes</h2>
      <div class="mytravel-route-scroll">
        <div v-for="(route, index) in routes" :key="index" class="mytravel-route-card">
          <img :src="route.image" class="mytravel-route-img" />
          <div class="mytravel-route-content">
            <h3 class="mytravel-route-title">{{ route.title }}</h3>
            <p class="mytravel-route-sub"><span>{{ route.duration }}</span><span>{{ route.spots }}个景点</span></p>
            <div class="mytravel-route-footer">
              <img src="@/assets/icons/mytravel/mytravel-star.png" alt="图标" class="mytravel-star">
              <span>{{ route.rating }}</span>
              <button class="mytravel-add-btn">Add to Trip</button>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- 精选攻略 -->
    <div class="mytravel-section">
      <h2 class="mytravel-section-title">Popular Travel Guides</h2>
      <div v-for="(tip, index) in tips" :key="index" class="tip-card">
        <img :src="tip.image" class="tip-img" />
        <div class="tip-content">
          <h3 class="tip-title">{{ tip.title }}</h3>
          <p class="tip-desc">{{ tip.desc }}</p>
          <p class="tip-mytravel-meta">
            <span class="mytravel-meta-item">{{ tip.author }}</span>
            <span class="mytravel-meta-item-gap">{{ tip.views }} Views</span>
            <span>{{ tip.likes }} likes</span>
          </p>

        </div>
      </div>
    </div>


    <div class="mytravel-bottom">
      <img src="@/assets/icons/mytravel/mytravel-startwrite.png" alt="图标" class="mytravel-startwriteimg">
      <div class="mytravel-startwrite">Start Planning</div>
    </div>
  </div>

</template>

<script setup lang="ts">
  import RMMDD from '@/assets/icons/mytravel/mytravel-remenmudidi.png'
  import ZTLY from '@/assets/icons/mytravel/mytravel-zhutilvxing.png'
  import JJJX from '@/assets/icons/mytravel/mytravel-jijiejinxuan.png'
  import TSMS from '@/assets/icons/mytravel/mytravel-tesemeishi.png'
  import GGMWY from '@/assets/images/mytravel/mytravel-gugongbowuyuanshenduyoulanzhinan.png'
  import BJHT from '@/assets/images/mytravel/mytravel-beijinghutongmeishiditu.png'
  import GGSDY from '@/assets/images/mytravel/mytravel-gugongshenduyou.png'
  import HTWHTY from '@/assets/images/mytravel/mytravel-hutongwenhuatiyan.png'
  import BJSDBWG from '@/assets/images/mytravel/mytravel-beijingshoudubowuguan.png'
  const tags = [
    {
      img:RMMDD,
      label: 'Popular destinations',
      active: true
    },
    {
      img:ZTLY,
      label: 'Theme Travel',
      active: false
    },
    {
      img:JJJX,
      label: 'Seasonal Picks',
      active: false

    },
    {
      img:TSMS,
      label: 'Popular Food',
      active: false

    },
  ];

const routes = [
  {
    title: 'Imperial Palace',
    duration: '2 Days 1 Night',
    spots: 8,
    rating: 4.8,
    image: GGSDY,
  },
  {
    title: 'Hutong Tour',
    duration: '1 Day',
    spots: 5,
    rating: 4.6,
    image: HTWHTY,
  },
  {
    title: 'Beijing Capital Museum',
    duration: '1 Day',
    spots: 1,
    rating: 4.8,
    image: BJSDBWG,
  },
];

const tips = [
        {
          title: 'Imperial Palace',
          desc: 'Avoid crowds and discover hidden gems in the Forbidden City.',
          author: 'Expert',
          views: '2.3k',
          likes: 856,
          image: GGMWY,
        },
        {
          title: 'Beijing Hutong',
          desc: 'Beijing delicacies recommended, take you to find traditional flavors.',
          author: 'Foodie',
          views: '1.8k',
          likes: 654,
          image: BJHT,
        },
];
</script>

<style scoped>
.mytravel-app-container {
  width: 100%;
  min-height: 844px;
  background-color: #ece4f0;
  overflow-y: auto;
  margin: auto;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  color: #3d2e5c;
}

.mytravel-header {
  display: flex;
  justify-content: space-between;
  padding: 24px 24px 16px;
  align-items: center;
}
.mytravel-title {
  font-size: 18px;
  font-weight: bold;
  color: #4a3d6e;
}
.mytravel-back {
  height: 40px;
  width: 40px;
}
.mytravel-share{
  left:290px;
  height: 40px;
  width: 40px;
}

.mytravel-card {
  display: flex;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: #4a3d6e;
  border: 1px solid rgba(255, 255, 255, 0.6);
  margin: 0 24px;
  border-radius: 20px;
  padding: 14px;
  align-items: center;
  box-shadow: 0 8px 32px rgba(155, 109, 255, 0.12);
}
.mytravel-img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 14px;
}
.mytravel-info {
  flex: 1;
  margin-left: 16px;
}
.mytravel-title-beijing{
  font-size: 16px;
  font-weight: bold;
  color: #4a3d6e;
}
.mytravel-date {
  font-size: 14px;
  font-weight: lighter;
  margin-top: 4px;
  color: #9a8bc5;
}

.mytravel-buttons {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
.mytravel-preview-btn {
  color: #9b6dff;
  border-radius: 20px;
  padding: 4px 16px;
  font-size: 12px;
  border: 1.5px solid rgba(155, 109, 255, 0.4);
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
}
.mytravel-edit-btn {
  background: linear-gradient(135deg, #91defe 0%, #bdb6ec 50%, #f9bccc 100%);
  color: #ffffff;
  border-radius: 20px;
  padding: 4px 16px;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(186, 171, 218, 0.3);
}




/* 进度条 */
.mytravel-progress-info {
  display: flex;
  padding-top: 8px;
  padding-left: 32px;
  padding-bottom:8px;
  font-size: 14px;
  color: #6b5b8a;
  gap:8px;
  align-items: center;
}
.mytravel-定位{
  width: 20px;
  height: 20px;
}
.mytravel-time{
  margin-left: 100px;
  width: 20px;
  height: 20px;
}
.mytravel-progress-bar-wrapper {
  padding: 0 32px;
}
.mytravel-progress-bar-bg {
  width: 100%;
  height: 6px;
  background: rgba(186, 171, 218, 0.25);
  border-radius: 6px;
}
.mytravel-progress-bar-fill {
  width: 50%;
  height: 6px;
  background: linear-gradient(to right, #91defe, #bdb6ec, #f9bccc);
  border-radius: 6px;
}
.mytravel-next-stop {
  font-size: 14px;
  margin-left: 150px;
  color: #9a8bc5;
  margin-top: 4px;
}

/* 标签横滑 */
.mytravel-filter-scroll {
  overflow-x: auto;
  scrollbar-width: none;
  white-space: nowrap;
  padding: 16px 16px 4px 4px;
  margin-left: 16px;
}

.mytravel-filter-buttons {
  display: inline-flex;
  gap: 12px;
}

.mytravel-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #6b5b8a;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(155, 109, 255, 0.06);
}

.mytravel-filter-btn.active {
  background: linear-gradient(135deg, #91defe 0%, #bdb6ec 50%, #f9bccc 100%);
  color: white;
  border: none;
  box-shadow: 0 6px 16px rgba(186, 171, 218, 0.4);
}

.mytravel-btn-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
}


/* 推荐路线 */
.mytravel-section {
  padding: 8px 24px;
}
.mytravel-section-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #4a3d6e;
}
.mytravel-route-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;
}
.mytravel-route-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 18px;
  width: 200px;
  flex-shrink: 0;
  box-shadow: 0 8px 28px rgba(155, 109, 255, 0.1);
  overflow: hidden;
}
.mytravel-route-img {
  width: 100%;
  height: 120px;
  object-fit: cover;
}
.mytravel-route-content {
  padding: 10px 12px;
  font-size: 14px;
}
.mytravel-route-title {
  font-weight: bold;
  color: #4a3d6e;
  font-size: 15px;
}
.mytravel-route-sub {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #9a8bc5;
  margin-top: 6px;
}
.mytravel-star{
  width: 16px;
  height: 16px;
  margin-top: 4px;
}
.mytravel-route-footer {
  display: flex;
  align-items: left;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 14px;
  color: #6b5b8a;
}
.mytravel-add-btn {
  color: #FFFFFF;
  background: linear-gradient(135deg, #bdb6ec 0%, #9b6dff 100%);
  border: none;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(155, 109, 255, 0.25);
}

/* 精选攻略 */
.tip-card {
  display: flex;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 18px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 8px 28px rgba(155, 109, 255, 0.08);
}
.tip-img {
  width: 90px;
  height: 90px;
  object-fit: cover;
  border-radius: 12px;
}
.tip-content {
  margin-left: 16px;
  font-size: 16px;
}
.tip-title {
  font-weight: bold;
  color: #4a3d6e;
}
.tip-desc {
  font-size: 12px;
  color: #9a8bc5;
  margin-top: 2px;
}
.tip-mytravel-meta {
  font-size: 12px;
  color: #baabda;
  margin-top: 4px;
}

.mytravel-meta-item {
  display: inline-block;
  margin-right: 24px;
}
.mytravel-meta-item-gap {
  display: inline-block;
  margin-right: 8px;
}

.mytravel-bottom {
  display: flex;
  background: linear-gradient(135deg, #91defe 0%, #bdb6ec 50%, #f9bccc 100%);
  padding: 12px;
  width: 80%;
  height: 48px;
  margin: 16px 32px;
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(186, 171, 218, 0.35);
  cursor: pointer;
  align-items: center;
  justify-content: center;
}
.mytravel-startwriteimg{
  width: 20px;
  height: 20px;
  margin-right: 6px;
}
.mytravel-startwrite {
  font-size: 16px;
  font-weight: bold;
  color:#ffffff;
}
</style>