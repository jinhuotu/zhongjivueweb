<script setup lang="ts">
import type { Component } from 'vue'
import {
  ShieldCheck,
  CircleCheck,
  Clock,
  TriangleAlert,
  FileText,
  Download,
  Search,
  Lock,
} from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import {
  MRV_PILLARS,
  VERIFICATION_PROCESS,
  EVIDENCE_PACK,
  QUALITY_GATES,
} from '@/lib/mock'

type Tone = 'iron' | 'patina' | 'molybdenum' | 'sulfur'

const TEXT_CLS: Record<Tone | 'muted', string> = {
  iron: 'text-iron',
  patina: 'text-patina',
  molybdenum: 'text-molybdenum',
  sulfur: 'text-sulfur',
  muted: 'text-muted-foreground',
}

const BORDER_CLS: Record<Tone, string> = {
  iron: 'border-iron/30',
  patina: 'border-patina/30',
  molybdenum: 'border-molybdenum/30',
  sulfur: 'border-sulfur/30',
}

const BG_SOFT: Record<Tone, string> = {
  iron: 'bg-iron/5',
  patina: 'bg-patina/5',
  molybdenum: 'bg-molybdenum/5',
  sulfur: 'bg-sulfur/5',
}

const BG_BAR: Record<Tone | 'muted', string> = {
  iron: 'bg-iron',
  patina: 'bg-patina',
  molybdenum: 'bg-molybdenum',
  sulfur: 'bg-sulfur',
  muted: 'bg-muted-foreground',
}

const RING_CLS: Record<string, string> = {
  done: 'border-patina',
  doing: 'border-molybdenum',
  pending: 'border-border',
}

function pillarTone(c: string): Tone {
  if (c === 'iron' || c === 'patina' || c === 'molybdenum' || c === 'sulfur') return c
  return 'molybdenum'
}

function stepTone(status: string): Tone | 'muted' {
  if (status === 'done') return 'patina'
  if (status === 'doing') return 'molybdenum'
  return 'muted'
}

function stepIcon(status: string): Component {
  if (status === 'done') return CircleCheck
  if (status === 'doing') return Search
  return Clock
}

const orgs = [
  { name: '中证联合认证中心', code: 'CTI-V', score: '已合作 3 年', last: '2024-Q3 出具核查报告' },
  { name: '必维国际检验集团', code: 'BV', score: 'CCER 项目核查', last: '2024-Q2 余热回收 CCER' },
  { name: 'DNV 挪威船级社', code: 'DNV', score: 'ISO 14064-1', last: '2024-Q1 首次签发' },
  { name: '中信碳元素', code: 'CTC', score: '产品碳足迹', last: '2024-Q3 ISO 14067' },
]

const uncertainty = [
  {
    name: '范围一 直接排放',
    u: '3.6%',
    sources: '燃气计量 1.8% · 排放因子 2.4% · 热值波动 1.2%',
    color: 'iron' as Tone,
  },
  {
    name: '范围二 间接电力',
    u: '2.4%',
    sources: '电表 0.5% · 因子 2.3%',
    color: 'molybdenum' as Tone,
  },
  {
    name: '范围三 上下游',
    u: '8.6%',
    sources: '供应商一手数据 62% · 行业平均 38%',
    color: 'patina' as Tone,
  },
]
</script>

<template>
  <Panel title="MRV 体系总览" subtitle="Monitoring · Reporting · Verification 三支柱">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="p in MRV_PILLARS"
        :key="p.id"
        :class="['rounded-md border p-4', BORDER_CLS[pillarTone(p.color)], BG_SOFT[pillarTone(p.color)]]"
      >
        <div :class="['text-[11px] tracking-widest font-mono', TEXT_CLS[pillarTone(p.color)]]">
          {{ p.id }}
        </div>
        <div class="text-base text-text-primary mt-1">{{ p.name }}</div>
        <div :class="['font-mono text-2xl mt-3', TEXT_CLS[pillarTone(p.color)]]">{{ p.metric }}</div>
        <div class="text-[12px] text-text-muted mt-2 leading-relaxed">{{ p.detail }}</div>
      </div>
    </div>
  </Panel>

  <Panel title="核查工作流" subtitle="ISO 14064-3 + 全国碳市场 MRV 七步法" class-name="mt-4">
    <div class="space-y-4">
      <div v-for="(s, i) in VERIFICATION_PROCESS" :key="s.id" class="flex items-start gap-4">
        <div
          :class="[
            'shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center font-mono text-[11px]',
            RING_CLS[s.status],
            TEXT_CLS[stepTone(s.status)],
          ]"
        >
          {{ i + 1 }}
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-text-primary">
              <component :is="stepIcon(s.status)" :class="['w-4 h-4', TEXT_CLS[stepTone(s.status)]]" />
              {{ s.step }}
            </div>
            <div class="font-mono text-[12px] text-text-muted">进度 {{ s.progress }}%</div>
          </div>
          <div class="text-[12px] text-text-muted mt-1">{{ s.desc }}</div>
          <div class="h-1 rounded bg-bg-base overflow-hidden mt-2">
            <div
              :class="['h-full', BG_BAR[stepTone(s.status)]]"
              :style="{ width: `${s.progress}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </Panel>

  <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
    <Panel title="数据质量门 Quality Gates" subtitle="6 项准入指标 · 不通过则终止核查" class-name="xl:col-span-1">
      <div class="space-y-2">
        <div
          v-for="q in QUALITY_GATES"
          :key="q.id"
          :class="[
            'flex items-start gap-3 p-3 rounded border',
            q.status === 'pass' ? 'border-patina/30 bg-patina/5' : 'border-sulfur/30 bg-sulfur/5',
          ]"
        >
          <CircleCheck v-if="q.status === 'pass'" class="w-4 h-4 mt-0.5 text-patina" />
          <TriangleAlert v-else class="w-4 h-4 mt-0.5 text-sulfur" />
          <div class="flex-1 min-w-0">
            <div class="text-[12px] text-text-primary">{{ q.name }}</div>
            <div class="text-[11px] text-text-muted">阈值 {{ q.target }}</div>
          </div>
          <div :class="['font-mono text-[12px]', q.status === 'pass' ? 'text-patina' : 'text-sulfur']">
            {{ q.actual }}
          </div>
        </div>
      </div>
    </Panel>

    <Panel title="证据包档案库" subtitle="核查证据自动归集 / SHA-256 签名 / 保留期 ≥ 5 年" class-name="xl:col-span-2" flush>
      <table class="w-full text-[12px]">
        <thead class="text-text-muted">
          <tr class="border-b border-hairline">
            <th class="text-left px-4 py-3">编号</th>
            <th class="text-left">证据名称</th>
            <th class="text-left">期间</th>
            <th class="text-left">类型</th>
            <th class="text-right">体积</th>
            <th class="text-left px-3">SHA-256</th>
            <th class="text-left">关联</th>
            <th class="text-center px-3">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-hairline">
          <tr v-for="e in EVIDENCE_PACK" :key="e.id" class="hover:bg-bg-base/40">
            <td class="px-4 py-2.5 font-mono text-molybdenum">{{ e.id }}</td>
            <td>
              <span class="flex items-center gap-2 text-text-primary">
                <FileText class="w-3.5 h-3.5 text-text-muted" />{{ e.name }}
              </span>
            </td>
            <td class="text-text-muted">{{ e.period }}</td>
            <td>
              <span class="px-2 py-0.5 rounded bg-bg-base text-[11px] uppercase">{{ e.type }}</span>
            </td>
            <td class="font-mono text-right">{{ e.size }}</td>
            <td class="px-3 font-mono text-[11px] text-coolant">{{ e.sha }}</td>
            <td class="text-[11px] text-patina">{{ e.linked }}</td>
            <td class="text-center px-3 py-2.5">
              <button class="text-molybdenum hover:underline inline-flex items-center gap-1">
                <Download class="w-3.5 h-3.5" />下载
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>
  </div>

  <Panel title="核查机构对接" subtitle="DOE / DNV / 中证 / 必维 资质对接" class-name="mt-4">
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-[12px]">
      <div
        v-for="o in orgs"
        :key="o.code"
        class="rounded border border-hairline bg-bg-base/40 p-3"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="text-text-primary">{{ o.name }}</div>
          <span class="font-mono text-[11px] text-iron border border-iron/30 px-2 rounded shrink-0">
            {{ o.code }}
          </span>
        </div>
        <div class="text-[11px] text-text-muted mt-1">{{ o.score }}</div>
        <div class="text-[11px] text-patina mt-2 flex items-center gap-1">
          <ShieldCheck class="w-3 h-3" />{{ o.last }}
        </div>
      </div>
    </div>
  </Panel>

  <Panel title="不确定度评估" subtitle="GUM 法 95% 置信区间 · 范围一 / 范围二 / 范围三" class-name="mt-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
      <div
        v-for="s in uncertainty"
        :key="s.name"
        :class="['rounded border p-4', BORDER_CLS[s.color], BG_SOFT[s.color]]"
      >
        <div :class="['text-sm', TEXT_CLS[s.color]]">{{ s.name }}</div>
        <div :class="['font-mono text-3xl mt-2', TEXT_CLS[s.color]]">±{{ s.u }}</div>
        <div class="text-[11px] text-text-muted mt-2 leading-relaxed">不确定度来源：{{ s.sources }}</div>
        <div class="text-[11px] text-text-muted mt-1 flex items-center gap-1">
          <Lock class="w-3 h-3" />已纳入披露脚注
        </div>
      </div>
    </div>
  </Panel>
</template>
