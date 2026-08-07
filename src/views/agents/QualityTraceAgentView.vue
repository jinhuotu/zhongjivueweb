<script setup lang="ts">
import AgentRunLayout from '@/components/agents/AgentRunLayout.vue'
import type { WorkflowNode, WorkflowStep } from '@/components/agents/types'

const nodes: WorkflowNode[] = [
  { id: 'n1', label: '原料入库质检', status: 'done' },
  { id: 'n2', label: '工序巡检', status: 'done' },
  { id: 'n3', label: '成品检测', status: 'current' },
  { id: 'n4', label: '出库留样', status: 'pending' },
  { id: 'n5', label: '售后召回', status: 'pending' },
]

const logSteps: WorkflowStep[] = [
  {
    id: 'l1',
    title: '自动拉取 MES 工序数据',
    type: 'ai',
    desc: '12 道工序，384 个参数点',
  },
  {
    id: 'l2',
    title: '关联供应商质检报告',
    type: 'static',
    desc: '5 家供应商，12 批次原料',
  },
  {
    id: 'l3',
    title: '批次链溯源分析',
    type: 'ai',
    desc: '正向/反向双向追溯',
    children: [
      { id: 'l3-1', title: '正向追溯：原料→成品', type: 'branch' },
      { id: 'l3-2', title: '反向追溯：成品→原料', type: 'branch' },
      { id: 'l3-3', title: '同批次关联工单筛选', type: 'static' },
    ],
  },
  { id: 'l4', title: '质量数据聚合建模', type: 'ai' },
  { id: 'l5', title: '生成追溯档案', type: 'static', desc: '支持 PDF 导出' },
]

const abnormalSteps: WorkflowStep[] = [
  {
    id: 'a1',
    title: '自动拉取 MES 工序数据',
    type: 'ai',
    desc: '12 道工序，384 个参数点',
  },
  {
    id: 'a2',
    title: '关联供应商质检报告',
    type: 'static',
    desc: '5 家供应商，12 批次原料',
  },
  {
    id: 'a3',
    title: '批次链溯源分析',
    type: 'ai',
    desc: '正向/反向双向追溯',
  },
  { id: 'a4', title: '质量数据聚合建模', type: 'ai' },
  { id: 'a5', title: '生成追溯档案', type: 'static', desc: '支持 PDF 导出' },
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
    title="质量追溯智能体"
    subtitle="全链路质量追溯与召回"
    :nodes="nodes"
    :kpis="kpis"
    :records="records"
    :log-steps="logSteps"
    :abnormal-steps="abnormalSteps"
    :show-abnormal-card="false"
  />
</template>
