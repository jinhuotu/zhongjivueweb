// ============================================================================
// 【中文注解】src/main.ts | Vue应用入口（三件套装配）
// - createApp(App)→use(pinia状态)→use(router路由)→mount(#app)，顺序不可乱，
//   theme store需在pinia之后初始化。样式style.css全局引入。
// - 学习： main → App.vue(壳) → router(页) → stores(数据) → lib/api(请求)。
// - 只加注释，未改逻辑。
// ============================================================================
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
useThemeStore(pinia)
app.mount('#app')
