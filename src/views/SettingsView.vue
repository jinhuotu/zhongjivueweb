<script setup lang="ts">
import {
  Bell,
  CircleCheck,
  Database,
  Languages,
  Network,
  Settings,
  Shield,
  Wrench,
} from 'lucide-vue-next'
import { Panel, PageHeader, Tag } from '@/components/ui-kit'

const dataLinks = [
  { name: 'OPC-UA 服务器', addr: 'opc.tcp://10.16.3.21:4840', status: '在线', color: 'patina' as const },
  { name: 'Modbus TCP 网关 ×4', addr: '10.16.5.0/24', status: '在线', color: 'patina' as const },
  { name: 'DCS 中控系统', addr: 'Honeywell C300', status: '在线', color: 'patina' as const },
  { name: 'PLC S7-1500 ×12', addr: '10.16.7.0/24', status: '在线', color: 'patina' as const },
  { name: '电表 IEC 62056', addr: '10.16.9.0/24', status: '异常 (2/18)', color: 'sulfur' as const },
  { name: '能源管理 EMS', addr: '内网 RESTful', status: '在线', color: 'patina' as const },
]

const channels = [
  { c: '钉钉 群机器人', conf: '热处理车间监控群 + 总厂应急群', on: true },
  { c: '企业微信', conf: '能源管理部 + 双碳办', on: true },
  { c: '短信', conf: '阿里云 短信网关', on: true },
  { c: '电话外呼', conf: '云呼叫中心', on: true },
  { c: '邮件', conf: 'mail.exchange.local', on: false },
  { c: 'Webhook', conf: 'https://oa.example.com/hook/alert', on: true },
]

const sysInfo: [string, string][] = [
  ['平台版本', 'LuJing ECMS v3.2.1'],
  ['构建号', 'build-4810 · 2024-10-30'],
  ['授权类型', '企业版 · 永久授权'],
  ['授权设备数', '≤ 50 台车式窑'],
  ['许可证有效期', '2032-12-31'],
  ['授权主体', '某钢铁集团有限公司'],
  ['许可证编号', 'LJ-ENT-2024-08832'],
  ['等保等级', '三级 (2024-09 复审)'],
  ['数据库', 'PostgreSQL 15.4 + TimescaleDB'],
  ['时序点位', '3 842 个 / 1.2 TB'],
]

const security = [
  { name: '双因子登录 (TOTP)', desc: '管理员强制开启' },
  { name: 'IP 白名单', desc: '仅允许内网 + 堡垒机' },
  { name: '操作审计日志', desc: '留存 ≥ 6 个月' },
  { name: '敏感数据脱敏', desc: '手机号 / 报告对外展示' },
  { name: 'SSO 单点登录', desc: '对接 OA OAuth 2.0' },
  { name: '数据加密传输', desc: 'TLS 1.3 + SM4 国密' },
]
</script>

<template>
  <PageHeader
    title="系统设置"
    description="平台运行参数、数据采集协议、告警通道、安全合规等配置入口。修改将记入审计日志。"
  >
    <template #badges>
      <Tag tone="molybdenum">v3.2.1 build 4810</Tag>
    </template>
  </PageHeader>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
    <Panel title="数据采集接入" subtitle="实时上行链路" flush>
      <ul class="divide-y divide-border">
        <li
          v-for="(c, i) in dataLinks"
          :key="i"
          class="px-4 py-3 flex items-center justify-between hover:bg-background/40"
        >
          <div class="flex items-center gap-3">
            <component
              :is="c.name.includes('EMS') ? Database : Network"
              class="size-4 text-muted-foreground"
            />
            <div>
              <div class="text-sm">{{ c.name }}</div>
              <div class="data-num text-[10px] text-muted-foreground mt-0.5">{{ c.addr }}</div>
            </div>
          </div>
          <span
            :class="
              c.color === 'patina'
                ? 'inline-flex items-center gap-1 text-patina text-xs'
                : 'inline-flex items-center gap-1 text-sulfur text-xs'
            "
          >
            <span
              :class="
                c.color === 'patina'
                  ? 'size-1.5 rounded-full bg-patina'
                  : 'size-1.5 rounded-full bg-sulfur'
              "
            />
            {{ c.status }}
          </span>
        </li>
      </ul>
    </Panel>

    <Panel title="告警通道" flush>
      <ul class="divide-y divide-border">
        <li
          v-for="(c, i) in channels"
          :key="i"
          class="px-4 py-3 flex items-center justify-between"
        >
          <div>
            <div class="text-sm flex items-center gap-2">
              <Bell class="size-3.5 text-muted-foreground" />
              {{ c.c }}
            </div>
            <div class="text-[10px] text-muted-foreground mt-0.5 ml-5">{{ c.conf }}</div>
          </div>
          <span
            :class="
              c.on
                ? 'inline-block w-9 h-5 rounded-full bg-iron relative'
                : 'inline-block w-9 h-5 rounded-full bg-muted relative'
            "
          >
            <span
              :class="
                c.on
                  ? 'absolute top-0.5 left-[18px] size-4 rounded-full bg-background transition'
                  : 'absolute top-0.5 left-0.5 size-4 rounded-full bg-background transition'
              "
            />
          </span>
        </li>
      </ul>
    </Panel>

    <Panel title="系统信息" flush>
      <dl class="divide-y divide-border">
        <div
          v-for="([k, v], i) in sysInfo"
          :key="i"
          class="px-4 py-2.5 flex justify-between items-center text-xs"
        >
          <dt class="text-muted-foreground">{{ k }}</dt>
          <dd class="data-num text-foreground/90">{{ v }}</dd>
        </div>
      </dl>
    </Panel>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
    <Panel title="安全设置">
      <ul class="space-y-3 text-xs">
        <li
          v-for="(c, i) in security"
          :key="i"
          class="flex items-center justify-between rounded-md panel-elevated px-3 py-2.5"
        >
          <div class="flex items-center gap-2.5">
            <Shield class="size-4 text-coolant" />
            <div>
              <div class="text-sm">{{ c.name }}</div>
              <div class="text-[10px] text-muted-foreground">{{ c.desc }}</div>
            </div>
          </div>
          <CircleCheck class="size-4 text-patina" />
        </li>
      </ul>
    </Panel>

    <Panel title="个性化与本地化">
      <div class="space-y-4 text-xs">
        <div class="flex items-center justify-between py-2 border-b border-border">
          <div class="flex items-center gap-2">
            <Languages class="size-4 text-muted-foreground" />
            <span>界面语言</span>
          </div>
          <div class="flex gap-1">
            <button
              type="button"
              class="px-2.5 py-1 rounded bg-iron/15 border border-iron/30 text-iron data-num"
            >
              简体中文
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded border border-border text-muted-foreground data-num"
            >
              English
            </button>
          </div>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-border">
          <div class="flex items-center gap-2">
            <Settings class="size-4 text-muted-foreground" />
            <span>时区</span>
          </div>
          <span class="data-num">UTC+08:00 北京</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-border">
          <div class="flex items-center gap-2">
            <Wrench class="size-4 text-muted-foreground" />
            <span>数据采样精度</span>
          </div>
          <span class="data-num">秒级 (1 Hz)</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-border">
          <span>能耗单位偏好</span>
          <span class="data-num">tce / kgce-t</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-border">
          <span>碳排单位偏好</span>
          <span class="data-num">tCO₂e</span>
        </div>
        <div class="flex items-center justify-between py-2">
          <span>主题</span>
          <span class="data-num text-iron">默认浅色 · 顶栏可切换深色</span>
        </div>
      </div>
    </Panel>
  </div>
</template>
