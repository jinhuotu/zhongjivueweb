<script setup lang="ts">
import AgentRunLayout from '@/components/agents/AgentRunLayout.vue'
import type { WorkflowNode, WorkflowStep } from '@/components/agents/types'

const nodes: WorkflowNode[] = [
  { id: 'n1', label: '入库质检', status: 'done' },
  { id: 'n2', label: '上架分配', status: 'done' },
  { id: 'n3', label: '库存盘点', status: 'done' },
  { id: 'n4', label: '出库拣货', status: 'current' },
  { id: 'n5', label: '库位预警', status: 'warning' },
]

const logSteps: WorkflowStep[] = [
  { id: 'l1', title: '入库扫码核验批次', type: 'static', desc: '今日入库 48 托' },
  {
    id: 'l2',
    title: 'AI 智能分配库位',
    type: 'ai',
    desc: '考虑周转率/温区/重量',
  },
  {
    id: 'l3',
    title: '循环盘点计划生成',
    type: 'ai',
    desc: '今日盘点 12 个库位',
  },
  {
    id: 'l4',
    title: '临期物料自动调拨',
    type: 'ai',
    desc: '3 批物料建议调拨至 1 号车间',
  },
  {
    id: 'l5',
    title: '呆滞料分析报告',
    type: 'ai',
    desc: '识别 18 项呆滞 > 90 天',
    children: [
      { id: 'l5-1', title: '调取 6 个月领用数据', type: 'static' },
      { id: 'l5-2', title: 'ABC 分类计算', type: 'ai' },
      { id: 'l5-3', title: '生成处置建议清单', type: 'static' },
    ],
  },
  {
    id: 'l6',
    title: '出库波次优化',
    type: 'ai',
    desc: '最优路径减少 22% 行走距离',
  },
]

const abnormalSteps: WorkflowStep[] = [
  { id: 'a1', title: '入库扫码核验批次', type: 'static', desc: '今日入库 48 托' },
  {
    id: 'a2',
    title: 'AI 智能分配库位',
    type: 'ai',
    desc: '考虑周转率/温区/重量',
  },
  {
    id: 'a3',
    title: '循环盘点计划生成',
    type: 'ai',
    desc: '今日盘点 12 个库位',
  },
  {
    id: 'a4',
    title: '临期物料自动调拨',
    type: 'ai',
    desc: '3 批物料建议调拨至 1 号车间',
  },
  {
    id: 'a5',
    title: '呆滞料分析报告',
    type: 'ai',
    desc: '识别 18 项呆滞 > 90 天',
  },
  {
    id: 'a6',
    title: '出库波次优化',
    type: 'ai',
    desc: '最优路径减少 22% 行走距离',
  },
]

const kpis = [
  { label: '今日处理量', value: '128', hint: '↑ 较昨日 +12%' },
  { label: '成功率', value: '96.4%', hint: '↑ 0.8%' },
  { label: '平均耗时', value: '4.2m', hint: '↓ 15%' },
]

const records = [
  { id: '001', task: '批次 B202607-28', time: '10:30', duration: '3.8 min', status: '成功' as const },
  { id: '002', task: '批次 B202607-27', time: '11:35', duration: '4.1 min', status: '成功' as const },
  { id: '003', task: '批次 B202607-26', time: '12:40', duration: '4.4 min', status: '异常' as const },
  { id: '004', task: '批次 B202607-25', time: '13:45', duration: '4.7 min', status: '成功' as const },
  { id: '005', task: '批次 B202607-24', time: '14:50', duration: '5.0 min', status: '成功' as const },
]
</script>

<template>
  <AgentRunLayout
    title="仓储智能体"
    subtitle="智能仓储调度与库存优化"
    :nodes="nodes"
    :kpis="kpis"
    :records="records"
    :log-steps="logSteps"
    :abnormal-steps="abnormalSteps"
  />
</template>
