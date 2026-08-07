<script setup lang="ts">
import { Brain, Plus } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { FP_MODELS } from '@/lib/mock-extended'

const models = FP_MODELS

const deployed = models.filter((m) => m.status === 'deployed').length
const training = models.filter((m) => m.status === 'training').length
const canary = models.filter((m) => m.status === 'canary').length

const kpis = [
  { label: '已部署', value: deployed, color: 'text-patina' },
  { label: '训练中', value: training, color: 'text-molybdenum' },
  { label: '灰度中', value: canary, color: 'text-sulfur' },
  { label: '模型总数', value: models.length, color: 'text-coolant' },
]

function statusBadge(status: string) {
  if (status === 'deployed') return 'bg-patina/15 text-patina border-patina/40'
  if (status === 'training') return 'bg-molybdenum/15 text-molybdenum border-molybdenum/40'
  return 'bg-sulfur/15 text-sulfur border-sulfur/40'
}

function statusLabel(status: string) {
  if (status === 'deployed') return '已部署'
  if (status === 'training') return '训练中'
  if (status === 'canary') return '灰度中'
  return status
}

function versionLabel(version: string) {
  return version.startsWith('v') ? version : `v${version}`
}

const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
const btnGhost =
  'inline-flex items-center !py-1 !px-2 h-auto text-xs rounded hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">预测模型管理</h1>
        <p class="text-sm text-muted-foreground mt-1">部署 / 训练 / 灰度 · 版本与评估</p>
      </div>
      <button :class="btnPrimary"><Plus class="size-3.5 mr-1" />新建模型</button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel v-for="s in kpis" :key="s.label" class-name="!p-3">
        <div class="text-[11px] text-muted-foreground">{{ s.label }}</div>
        <div :class="['data-num text-xl font-semibold mt-1', s.color]">{{ s.value }}</div>
      </Panel>
    </div>

    <Panel title="模型列表">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-hairline text-muted-foreground">
            <th class="text-left py-2 font-medium">模型名称</th>
            <th class="text-left py-2 font-medium">类型</th>
            <th class="text-left py-2 font-medium">版本</th>
            <th class="text-left py-2 font-medium">状态</th>
            <th class="text-left py-2 font-medium">准确率</th>
            <th class="text-left py-2 font-medium">更新时间</th>
            <th class="text-right py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="m in models"
            :key="m.id"
            class="border-b border-border-hairline/50 hover:bg-surface/50"
          >
            <td class="py-2.5">
              <div class="flex items-center gap-2">
                <Brain class="size-3.5 text-molybdenum" />
                <span class="font-medium">{{ m.name }}</span>
              </div>
            </td>
            <td class="py-2.5">{{ m.type }}</td>
            <td class="py-2.5">
              <span class="font-mono text-molybdenum">{{ versionLabel(m.version) }}</span>
            </td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]',
                  statusBadge(m.status),
                ]"
              >
                {{ statusLabel(m.status) }}
              </span>
            </td>
            <td class="py-2.5">
              <span class="data-num text-patina">{{ m.accuracy }}%</span>
            </td>
            <td class="py-2.5 text-muted-foreground">{{ m.updated }}</td>
            <td class="py-2.5 text-right">
              <button :class="btnGhost">评估</button>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>
  </div>
</template>
