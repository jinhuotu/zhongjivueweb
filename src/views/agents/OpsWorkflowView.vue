<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Activity, Clock, Play } from 'lucide-vue-next'
import { Panel, Tag } from '@/components/ui-kit'
import FullWorkflow from '@/components/agents/FullWorkflow.vue'
import {
  AGENT_OPTIONS,
  WORKFLOW_MAP,
  type AgentKey,
} from '@/lib/agents-workflow-data'

const activeAgent = ref<AgentKey>('plan')
const selectedNode = ref<string | undefined>()

const wf = computed(() => WORKFLOW_MAP[activeAgent.value])

watch(activeAgent, () => {
  selectedNode.value = undefined
})

const selected = computed(() =>
  wf.value.nodes.find((n) => n.id === selectedNode.value),
)

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-hairline bg-transparent hover:bg-bg-surface/60 transition-colors'
const btnPrimary =
  'inline-flex items-center justify-center gap-1 h-7 px-2.5 text-xs rounded border border-transparent bg-iron text-white hover:brightness-110 transition-colors w-full'

function typeLabel(type?: string) {
  if (type === 'ai') return 'AI 动态节点'
  if (type === 'branch') return '分支节点'
  if (type === 'loop') return '循环节点'
  if (type === 'merge') return '合并节点'
  return '静态节点'
}

function statusLabel(status?: string) {
  if (status === 'done') return '已完成'
  if (status === 'running') return '运行中'
  if (status === 'error') return '异常'
  return '待执行'
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-semibold">智能体运维后台</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          全链路工作流总览 · 支持回放 / 断点 / 日志导出
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" :class="btn">回放</button>
        <button type="button" :class="btn">导出日志</button>
      </div>
    </div>

    <div class="flex items-center gap-3 flex-wrap">
      <div class="w-48">
        <select
          v-model="activeAgent"
          class="w-full h-8 px-2 rounded-md border border-hairline bg-bg-base text-xs"
        >
          <option
            v-for="o in AGENT_OPTIONS"
            :key="o.value"
            :value="o.value"
          >
            {{ o.label }}
          </option>
        </select>
      </div>

      <div class="flex-1 flex items-center gap-4 text-xs flex-wrap">
        <Tag class-name="gap-1">
          <Activity class="size-3" />
          {{ wf.metadata.status }}
        </Tag>
        <span class="text-muted-foreground">
          运行 ID：
          <span class="font-mono text-text-secondary">{{
            wf.metadata.runId
          }}</span>
        </span>
        <span class="text-muted-foreground inline-flex items-center">
          <Clock class="size-3 mr-1" />{{ wf.metadata.duration }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div class="lg:col-span-3 space-y-3">
        <Panel
          :title="`${wf.metadata.name} · 全量工作流`"
          subtitle="灰色为静态流程 · 蓝色虚线为 AI 动态生成流程"
        >
          <FullWorkflow
            :nodes="wf.nodes"
            :edges="wf.edges"
            :selected-node="selectedNode"
            @node-click="selectedNode = $event"
          />
        </Panel>
      </div>

      <div class="space-y-3">
        <Panel title="节点详情">
          <div v-if="selected" class="space-y-3">
            <div>
              <div class="text-xs text-muted-foreground">节点名称</div>
              <div class="text-sm font-medium mt-1">{{ selected.title }}</div>
            </div>
            <div>
              <div class="text-xs text-muted-foreground">类型</div>
              <div class="text-sm mt-1">{{ typeLabel(selected.type) }}</div>
            </div>
            <div>
              <div class="text-xs text-muted-foreground">状态</div>
              <div class="text-sm mt-1">{{ statusLabel(selected.status) }}</div>
            </div>
            <button type="button" :class="btnPrimary">
              <Play class="size-3" />查看日志
            </button>
          </div>
          <div
            v-else
            class="text-xs text-muted-foreground text-center py-4"
          >
            点击节点查看详情
          </div>
        </Panel>

        <Panel title="统计">
          <div class="space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-muted-foreground">节点总数</span>
              <span class="font-mono">{{ wf.nodes.length }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">静态节点</span>
              <span class="font-mono">{{
                wf.nodes.filter((n) => n.type === 'static').length
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">AI 动态节点</span>
              <span class="font-mono text-molybdenum">{{
                wf.nodes.filter((n) => n.type === 'ai').length
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">分支节点</span>
              <span class="font-mono text-sulfur">{{
                wf.nodes.filter((n) => n.type === 'branch').length
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">循环节点</span>
              <span class="font-mono text-iron">{{
                wf.nodes.filter((n) => n.type === 'loop').length
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">动态连线</span>
              <span class="font-mono text-molybdenum">{{
                wf.edges.filter((e) => e.type === 'dynamic').length
              }}</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  </div>
</template>
