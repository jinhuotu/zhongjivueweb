<script setup lang="ts">
import { Brain, Play, GitBranch, Download } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { QUALITY_MODELS } from '@/lib/mock-extended'

const extras = [
  { trainData: '12.4 万条', updateTime: '2024-06-28', inference: 12 },
  { trainData: '8.1 万条', updateTime: '2024-06-20', inference: 8 },
  { trainData: '5.6 万条', updateTime: '2024-06-15', inference: 45 },
  { trainData: '3.2 万条', updateTime: '2024-06-10', inference: 28 },
]

const models = QUALITY_MODELS.map((m, i) => ({
  ...m,
  ...(extras[i] ?? { trainData: '—', updateTime: '—', inference: 0 }),
}))

const trainTrend = Array.from({ length: 30 }, (_, i) => 88 + Math.sin(i / 5) * 5 + i * 0.2)

function statusBadge(status: string) {
  if (status === '生产' || status === '生产中')
    return 'bg-patina/15 text-patina border-patina/40'
  if (status === '灰度') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-muted text-muted-foreground border-border-hairline'
}

const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
const btnGhost =
  'inline-flex items-center !py-1 !px-2 h-auto rounded hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">预测模型管理</h1>
        <p class="text-sm text-muted-foreground mt-1">
          AI 模型全生命周期 · 训练 / 部署 / 版本 / 评估
        </p>
      </div>
      <button :class="btnPrimary"><Brain class="size-3.5 mr-1" />训练新模型</button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel
        v-for="s in [
          { label: '模型总数', value: 12, color: 'text-molybdenum' },
          { label: '在线运行', value: 5, color: 'text-patina' },
          { label: '灰度测试', value: 3, color: 'text-sulfur' },
          { label: '平均准确率', value: '94.2%', color: 'text-coolant' },
        ]"
        :key="s.label"
        class-name="!p-3"
      >
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
            <th class="text-left py-2 font-medium">训练数据</th>
            <th class="text-left py-2 font-medium">更新时间</th>
            <th class="text-right py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="m in models"
            :key="m.name"
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
              <span class="font-mono text-molybdenum">{{ m.version }}</span>
            </td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                  statusBadge(m.status),
                ]"
              >
                {{ m.status }}
              </span>
            </td>
            <td class="py-2.5">
              <span class="data-num text-patina">{{ m.accuracy }}%</span>
            </td>
            <td class="py-2.5 text-muted-foreground">{{ m.trainData }}</td>
            <td class="py-2.5 text-muted-foreground">{{ m.updateTime }}</td>
            <td class="py-2.5 text-right">
              <div class="flex items-center justify-end gap-1">
                <button :class="btnGhost"><Play class="size-3" /></button>
                <button :class="btnGhost"><GitBranch class="size-3" /></button>
                <button :class="btnGhost"><Download class="size-3" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="模型训练趋势" subtitle="近 30 天准确率变化">
        <div class="flex items-end gap-1 h-32">
          <div
            v-for="(v, i) in trainTrend"
            :key="i"
            class="flex-1 bg-gradient-to-t from-molybdenum/60 to-coolant/60 rounded-t"
            :style="{ height: `${v}%` }"
          />
        </div>
      </Panel>
      <Panel title="模型对比矩阵">
        <div class="space-y-2">
          <div
            v-for="m in models.slice(0, 4)"
            :key="m.name"
            class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2.5"
          >
            <Brain class="size-4 text-molybdenum" />
            <div class="flex-1">
              <div class="text-xs font-medium">{{ m.name }}</div>
              <div class="text-[10px] text-muted-foreground">
                {{ m.type }} · {{ m.version }}
              </div>
            </div>
            <div class="flex items-center gap-4 text-xs">
              <span
                >准确率 <span class="data-num text-patina">{{ m.accuracy }}%</span></span
              >
              <span>推理 <span class="data-num">{{ m.inference }}ms</span></span>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>
