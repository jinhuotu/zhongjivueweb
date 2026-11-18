<script setup lang="ts">
import type { Template } from '@/lib/kiln-studio-api'
defineProps<{ zones: number; burners: number; templates: Template[]; active: string; enabled: string[] }>()
defineEmits<{ select: [key: string] }>()
</script>

<template>
  <div class="topology">
    <div class="topology-head"><span>设备与机理关联</span><small>{{ zones }} 个温区 / {{ burners }} 个烧嘴</small></div>
    <div class="pipe"><span>燃气总管</span><i /><span>空气总管</span></div>
    <div class="zones" :style="{ gridTemplateColumns: `repeat(${Math.min(zones, 8)}, minmax(45px, 1fr))` }">
      <button v-for="n in zones" :key="n" @click="$emit('select', 'thermal')"><span class="inlet" /><span>{{ n }} 区</span><small>温度测点</small></button>
    </div>
    <div class="flow"><span>分区换热与蓄热</span><i /><span>排烟与等效热损失</span></div>
    <div class="relations">
      <button v-for="item in templates.filter(t => ['energy', 'thermal', 'combustion'].includes(t.key))" :key="item.key" :class="{ active: active === item.key, disabled: !enabled.includes(item.key) }" @click="$emit('select', item.key)">
        <small>{{ enabled.includes(item.key) ? '已选机理' : '可选机理' }}</small><span>{{ item.name }}</span>
      </button>
    </div>
    <p>关系图展示确认后的温区与关联机理。烧嘴数量独立记录，未确认的烧嘴分区连接不自动推断。</p>
  </div>
</template>

<style scoped>
.topology { padding: 20px; background: #111c29; color: #dbe6ed; border-radius: 8px; }
.topology-head { display:flex; justify-content:space-between; align-items:center; font-size:13px; margin-bottom:24px; }
.topology-head small { color:#92a5b8; font-size:10px; }
.pipe,.flow { display:flex; align-items:center; gap:12px; color:#73bdb8; font-size:11px; }
.pipe i { flex:1; height:2px; background:#517d80; }
.zones { display:grid; gap:8px; padding:30px 8px 20px; border-bottom:2px solid #435568; }
.zones button { display:flex; flex-direction:column; align-items:center; gap:9px; position:relative; padding:16px 3px; border:1px solid #3c5667; border-radius:5px; background:#1a2b39; font-size:12px; cursor:pointer; }
.zones button:hover { border-color:#80c5bd; }
.zones small { font-size:9px; color:#95aabd; }
.inlet { position:absolute; height:30px; width:2px; background:#517d80; top:-31px; }
.flow { justify-content:center; color:#9babbc; padding:15px 0; }.flow i { width:30px; border-top:1px dashed #657b88; }
.relations { display:flex; gap:8px; margin-top:4px; }.relations button { flex:1; display:flex; flex-direction:column; align-items:flex-start; gap:6px; background:#172632; border:1px solid #354c5c; border-radius:5px; padding:12px; text-align:left; cursor:pointer; }
.relations button.active { border-color:#75bdb8; background:#203b43; }.relations small { color:#96adba; font-size:9px; }.relations span { font-size:11px; }.relations .disabled { opacity:.55; }
p { color:#869bad; font-size:10px; line-height:1.7; margin:16px 0 0; }
</style>
