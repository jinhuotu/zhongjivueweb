<script setup lang="ts">
import { ref } from 'vue'
import { AlertTriangle, BarChart3, Clock } from 'lucide-vue-next'
import { Panel, Tag } from '@/components/ui-kit'
import SimpleWorkflow from '@/components/agents/SimpleWorkflow.vue'
import WorkflowLogPanel from '@/components/agents/WorkflowLogPanel.vue'
import AbnormalDialog from '@/components/agents/AbnormalDialog.vue'
import type { WorkflowNode, WorkflowStep } from '@/components/agents/types'

const showAbnormal = ref(false)

const mainNodes: WorkflowNode[] = [
  { id: 'n1', label: '需求接收', status: 'done' },
  { id: 'n2', label: '产能测算', status: 'done' },
  { id: 'n3', label: '排程生成', status: 'current' },
  { id: 'n4', label: '异常校验', status: 'warning' },
  { id: 'n5', label: '下发工单', status: 'pending' },
]

const logSteps: WorkflowStep[] = [
  {
    id: 'l1',
    title: '从 ERP 拉取生产订单 (PO-202607-001)',
    type: 'static',
    desc: '12 条订单，合计 2840 吨',
  },
  {
    id: 'l2',
    title: '读取窑炉设备状态',
    type: 'static',
    desc: '8 台窑炉，2 台检修中',
  },
  {
    id: 'l3',
    title: '调用产能计算模型',
    type: 'ai',
    desc: 'AI 规划：考虑交期/能耗/换产成本',
  },
  {
    id: 'l4',
    title: '生成初始排程方案',
    type: 'ai',
    desc: '满足度 92.3%',
  },
  {
    id: 'l5',
    title: '校验环节 - 设备负荷',
    type: 'branch',
    desc: 'TC-06 负荷超标 115%',
    children: [
      { id: 'l5-1', title: '触发重排策略 A：转移订单', type: 'branch' },
      { id: 'l5-2', title: '调用排程优化算法', type: 'ai', desc: '第 2 次迭代...' },
      { id: 'l5-3', title: '重新计算碳排/能耗成本', type: 'static' },
    ],
  },
  {
    id: 'l6',
    title: '交期校验',
    type: 'static',
    desc: '10/12 满足，2 单延后 0.5 天',
  },
  {
    id: 'l7',
    title: '下发 MES 工单生成',
    type: 'static',
    desc: '待审批',
  },
]

const abnormalSteps: WorkflowStep[] = [
  { id: 'a1', title: '识别超限点：PO-002 与 PO-005 时间冲突', type: 'static' },
  { id: 'a2', title: '调用重排算法 v2.3', type: 'ai' },
  { id: 'a3', title: '策略 A：转移 PO-002 到 TC-03', type: 'branch' },
  { id: 'a4', title: '策略 B：拆分为两批次生产', type: 'branch' },
  { id: 'a5', title: '评估能耗/交期/碳排多维指标', type: 'ai' },
  { id: 'a6', title: '选择最优方案 B，满足度 94.7%', type: 'static' },
  { id: 'a7', title: '等待审批确认后下发', type: 'static' },
]

const scheduleRows = [
  { order: 'PO-001', product: '高铝砖 A1', qty: '320 吨', kiln: 'TC-01', due: '7月28日', status: '已排程' as const },
  { order: 'PO-002', product: '高铝砖 A2', qty: '370 吨', kiln: 'TC-02', due: '7月29日', status: '待重排' as const },
  { order: 'PO-003', product: '高铝砖 A3', qty: '420 吨', kiln: 'TC-03', due: '7月30日', status: '已排程' as const },
  { order: 'PO-004', product: '高铝砖 A4', qty: '470 吨', kiln: 'TC-04', due: '7月31日', status: '已排程' as const },
]

const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-transparent bg-iron text-white hover:brightness-110 transition-colors'

function onNodeClick(node: WorkflowNode) {
  if (node.status === 'warning') showAbnormal.value = true
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-semibold">
          计划智能体
          <span class="text-sm text-muted-foreground font-normal"
            >· 生产计划排程</span
          >
        </h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          自动完成订单接收→产能测算→排程生成→校验下发全流程
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Tag class-name="gap-1">
          <Clock class="size-3" />今日排程 3 次
        </Tag>
        <button type="button" :class="btnPrimary">立即重排</button>
      </div>
    </div>

    <Panel title="当前排程进度" subtitle="第 3 次排程迭代 · 2026-07-28 批次">
      <SimpleWorkflow :nodes="mainNodes" @node-click="onNodeClick" />
    </Panel>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 space-y-4">
        <div class="grid grid-cols-3 gap-3">
          <Panel>
            <div class="text-xs text-muted-foreground">计划订单数</div>
            <div class="text-2xl font-mono font-semibold mt-1">12</div>
            <div class="text-[11px] text-patina mt-1">↑ 较昨日 +2</div>
          </Panel>
          <Panel>
            <div class="text-xs text-muted-foreground">排程满足度</div>
            <div class="text-2xl font-mono font-semibold mt-1">92.3%</div>
            <div class="text-[11px] text-sulfur mt-1">目标 ≥ 95%</div>
          </Panel>
          <Panel>
            <div class="text-xs text-muted-foreground">设备利用率</div>
            <div class="text-2xl font-mono font-semibold mt-1">86.4%</div>
            <div class="text-[11px] text-patina mt-1">↑ 1.2%</div>
          </Panel>
        </div>

        <Panel title="排程结果摘要">
          <table class="w-full text-xs">
            <thead class="text-muted-foreground border-b border-hairline">
              <tr>
                <th class="text-left py-2 font-medium">订单号</th>
                <th class="text-left font-medium">产品</th>
                <th class="text-left font-medium">数量</th>
                <th class="text-left font-medium">窑炉</th>
                <th class="text-left font-medium">交期</th>
                <th class="text-left font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in scheduleRows"
                :key="row.order"
                class="border-b border-hairline/50"
              >
                <td class="py-2 font-mono">{{ row.order }}</td>
                <td>{{ row.product }}</td>
                <td>{{ row.qty }}</td>
                <td>{{ row.kiln }}</td>
                <td>{{ row.due }}</td>
                <td>
                  <Tag :tone="row.status === '待重排' ? 'sulfur' : 'default'">
                    {{ row.status }}
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
        <Panel title="异常提示">
          <div class="space-y-2">
            <button
              type="button"
              class="w-full flex items-start gap-2 p-2 rounded-md bg-sulfur/10 border border-sulfur/30 hover:bg-sulfur/20 transition-colors text-left"
              @click="showAbnormal = true"
            >
              <AlertTriangle class="size-4 text-sulfur mt-0.5 shrink-0" />
              <div>
                <div class="text-xs font-medium text-sulfur">
                  TC-06 设备负荷超标
                </div>
                <div class="text-[11px] text-muted-foreground">
                  当前 115%，智能体正在自动重排
                </div>
              </div>
            </button>
            <div
              class="flex items-start gap-2 p-2 rounded-md bg-patina/10 border border-patina/30"
            >
              <BarChart3 class="size-4 text-patina mt-0.5 shrink-0" />
              <div>
                <div class="text-xs font-medium text-patina">能耗协同优化</div>
                <div class="text-[11px] text-muted-foreground">
                  峰谷电价偏移节省 2.3 万元
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>

    <AbnormalDialog
      v-model:open="showAbnormal"
      title="设备负荷超标 · 智能体自动重排中"
      description="TC-06 窑炉排程负荷达到 115%，超过安全阈值。智能体已自动触发重排策略，详情如下："
      :steps="abnormalSteps"
    />
  </div>
</template>
