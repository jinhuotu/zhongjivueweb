<script setup lang="ts">
import AgentRunLayout from '@/components/agents/AgentRunLayout.vue'
import type { WorkflowNode, WorkflowStep } from '@/components/agents/types'

const nodes: WorkflowNode[] = [
  { id: 'n1', label: '不良数据接入', status: 'done' },
  { id: 'n2', label: '多维数据聚合', status: 'done' },
  { id: 'n3', label: '关联度计算', status: 'done' },
  { id: 'n4', label: '根因排序', status: 'current' },
  { id: 'n5', label: '验证模拟', status: 'pending' },
  { id: 'n6', label: '分析报告', status: 'pending' },
]

const logSteps: WorkflowStep[] = [
  {
    id: 'l1',
    title: '接入 MES 质量数据',
    type: 'static',
    desc: '不良类型：表面裂纹',
  },
  {
    id: 'l2',
    title: '拉取多系统数据',
    type: 'ai',
    desc: '设备参数/物料批次/工艺记录',
    children: [
      { id: 'l2-1', title: '调取设备运行参数', type: 'static' },
      { id: 'l2-2', title: '调取物料批次数据', type: 'static' },
      { id: 'l2-3', title: '调取工艺变更记录', type: 'static' },
    ],
  },
  { id: 'l3', title: '人/机/料/法/环 五维建模', type: 'ai' },
  {
    id: 'l4',
    title: 'AI 关联度迭代计算',
    type: 'ai',
    desc: '第 3 轮迭代',
  },
  { id: 'l5', title: '候选根因排序输出', type: 'ai' },
  { id: 'l6', title: '正反模拟验证', type: 'ai' },
  { id: 'l7', title: '生成分析报告', type: 'static' },
]

const abnormalSteps: WorkflowStep[] = [
  {
    id: 'a1',
    title: '接入 MES 质量数据',
    type: 'static',
    desc: '不良类型：表面裂纹',
  },
  {
    id: 'a2',
    title: '拉取多系统数据',
    type: 'ai',
    desc: '设备参数/物料批次/工艺记录',
  },
  { id: 'a3', title: '人/机/料/法/环 五维建模', type: 'ai' },
  {
    id: 'a4',
    title: 'AI 关联度迭代计算',
    type: 'ai',
    desc: '第 3 轮迭代',
  },
  { id: 'a5', title: '候选根因排序输出', type: 'ai' },
  { id: 'a6', title: '正反模拟验证', type: 'ai' },
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
    title="根因分析智能体"
    subtitle="AI 多维度根因定位与验证"
    :nodes="nodes"
    :kpis="kpis"
    :records="records"
    :log-steps="logSteps"
    :abnormal-steps="abnormalSteps"
    :show-abnormal-card="false"
  />
</template>
