<script setup lang="ts">
import AgentRunLayout from '@/components/agents/AgentRunLayout.vue'
import type { WorkflowNode, WorkflowStep } from '@/components/agents/types'

const nodes: WorkflowNode[] = [
  { id: 'n1', label: '需求汇总', status: 'done' },
  { id: 'n2', label: '询比价', status: 'done' },
  { id: 'n3', label: '供应商筛选', status: 'warning' },
  { id: 'n4', label: '合同生成', status: 'pending' },
  { id: 'n5', label: '入库对账', status: 'pending' },
]

const logSteps: WorkflowStep[] = [
  {
    id: 'l1',
    title: '合并 3 个部门物料需求',
    type: 'static',
    desc: '12 类物料，总金额 58 万',
  },
  {
    id: 'l2',
    title: '自动生成询价单并推送',
    type: 'ai',
    desc: '推送到 8 家合格供应商',
  },
  {
    id: 'l3',
    title: '多维度比价分析',
    type: 'ai',
    desc: '价格/质量/账期/运费综合评分',
  },
  {
    id: 'l4',
    title: '供应商资质校验',
    type: 'branch',
    desc: '2 家资质待复核',
    children: [
      { id: 'l4-1', title: '触发备选供应商询价', type: 'branch' },
      { id: 'l4-2', title: '调用工商/资质 API 核验', type: 'static' },
      { id: 'l4-3', title: 'AI 风险评估打分', type: 'ai' },
    ],
  },
  { id: 'l5', title: '生成合同草案', type: 'static' },
  { id: 'l6', title: '推送审批流', type: 'static' },
]

const abnormalSteps: WorkflowStep[] = [
  {
    id: 'a1',
    title: '合并 3 个部门物料需求',
    type: 'static',
    desc: '12 类物料，总金额 58 万',
  },
  {
    id: 'a2',
    title: '自动生成询价单并推送',
    type: 'ai',
    desc: '推送到 8 家合格供应商',
  },
  {
    id: 'a3',
    title: '多维度比价分析',
    type: 'ai',
    desc: '价格/质量/账期/运费综合评分',
  },
  {
    id: 'a4',
    title: '供应商资质校验',
    type: 'branch',
    desc: '2 家资质待复核',
  },
  { id: 'a5', title: '生成合同草案', type: 'static' },
  { id: 'a6', title: '推送审批流', type: 'static' },
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
    title="采购智能体"
    subtitle="智能寻源与采购全流程"
    :nodes="nodes"
    :kpis="kpis"
    :records="records"
    :log-steps="logSteps"
    :abnormal-steps="abnormalSteps"
  />
</template>
