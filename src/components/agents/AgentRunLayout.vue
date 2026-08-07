<script setup lang="ts">
import { ref } from 'vue'
import { AlertTriangle, Zap } from 'lucide-vue-next'
import { Panel, Tag } from '@/components/ui-kit'
import SimpleWorkflow from './SimpleWorkflow.vue'
import WorkflowLogPanel from './WorkflowLogPanel.vue'
import AbnormalDialog from './AbnormalDialog.vue'
import type { WorkflowNode, WorkflowStep } from './types'

export type AgentKpi = {
  label: string
  value: string
  hint: string
  hintTone?: 'patina' | 'sulfur'
}

export type AgentRecord = {
  id: string
  task: string
  time: string
  duration: string
  status: '成功' | '异常'
}

withDefaults(
  defineProps<{
    title: string
    subtitle: string
    description?: string
    badgeText?: string
    actionText?: string
    progressTitle?: string
    progressSubtitle?: string
    nodes: WorkflowNode[]
    kpis: AgentKpi[]
    records: AgentRecord[]
    logSteps: WorkflowStep[]
    abnormalTitle?: string
    abnormalDescription?: string
    abnormalSteps: WorkflowStep[]
    showAbnormalCard?: boolean
  }>(),
  {
    description: '智能体自动化执行，主流程极简呈现，详细步骤可展开查看',
    badgeText: '运行中',
    actionText: '查看历史',
    progressTitle: '当前执行进度',
    progressSubtitle: '第 1 次执行 · 今日',
    abnormalTitle: '异常处理 · 智能体自动执行中',
    abnormalDescription:
      '检测到异常情况，智能体已自动启动应急处理流程，详情如下：',
    showAbnormalCard: true,
  },
)

const showAbnormal = ref(false)

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-hairline bg-transparent hover:bg-bg-surface/60 transition-colors'

function onNodeClick(node: WorkflowNode) {
  if (node.status === 'warning') showAbnormal.value = true
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-semibold">
          {{ title }}
          <span class="text-sm text-muted-foreground font-normal"
            >· {{ subtitle }}</span
          >
        </h1>
        <p class="text-sm text-muted-foreground mt-0.5">{{ description }}</p>
      </div>
      <div class="flex items-center gap-2">
        <Tag class-name="gap-1">
          <Zap class="size-3" />{{ badgeText }}
        </Tag>
        <button type="button" :class="btn">{{ actionText }}</button>
      </div>
    </div>

    <Panel :title="progressTitle" :subtitle="progressSubtitle">
      <SimpleWorkflow :nodes="nodes" @node-click="onNodeClick" />
    </Panel>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 space-y-4">
        <div class="grid grid-cols-3 gap-3">
          <Panel v-for="k in kpis" :key="k.label">
            <div class="text-xs text-muted-foreground">{{ k.label }}</div>
            <div class="text-2xl font-mono font-semibold mt-1">
              {{ k.value }}
            </div>
            <div
              :class="[
                'text-[11px] mt-1',
                k.hintTone === 'sulfur' ? 'text-sulfur' : 'text-patina',
              ]"
            >
              {{ k.hint }}
            </div>
          </Panel>
        </div>

        <Panel title="执行记录">
          <table class="w-full text-xs">
            <thead class="text-muted-foreground border-b border-hairline">
              <tr>
                <th class="text-left py-2 font-medium">序号</th>
                <th class="text-left font-medium">任务</th>
                <th class="text-left font-medium">时间</th>
                <th class="text-left font-medium">耗时</th>
                <th class="text-left font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in records"
                :key="r.id"
                class="border-b border-hairline/50"
              >
                <td class="py-2 font-mono">{{ r.id }}</td>
                <td>{{ r.task }}</td>
                <td>{{ r.time }}</td>
                <td>{{ r.duration }}</td>
                <td>
                  <Tag :tone="r.status === '异常' ? 'sulfur' : 'patina'">
                    {{ r.status }}
                  </Tag>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>

      <div class="space-y-3">
        <WorkflowLogPanel
          title="AI 流程日志"
          :steps="logSteps"
          :default-open="true"
        />
        <Panel v-if="showAbnormalCard" title="异常提示">
          <button
            type="button"
            class="w-full flex items-start gap-2 p-2 rounded-md bg-sulfur/10 border border-sulfur/30 hover:bg-sulfur/20 transition-colors text-left"
            @click="showAbnormal = true"
          >
            <AlertTriangle class="size-4 text-sulfur mt-0.5 shrink-0" />
            <div>
              <div class="text-xs font-medium text-sulfur">检测到异常分支</div>
              <div class="text-[11px] text-muted-foreground">
                智能体已自动触发处理流程
              </div>
            </div>
          </button>
        </Panel>
      </div>
    </div>

    <AbnormalDialog
      v-model:open="showAbnormal"
      :title="abnormalTitle"
      :description="abnormalDescription"
      :steps="abnormalSteps"
    />
  </div>
</template>
