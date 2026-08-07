<script setup lang="ts">
import AgentRunLayout from '@/components/agents/AgentRunLayout.vue'
import type { WorkflowNode, WorkflowStep } from '@/components/agents/types'

const nodes: WorkflowNode[] = [
  { id: 'n1', label: '图像采集', status: 'done' },
  { id: 'n2', label: 'AI检测', status: 'done' },
  { id: 'n3', label: '缺陷分类', status: 'done' },
  { id: 'n4', label: '缺陷标注', status: 'current' },
  { id: 'n5', label: '分级判定', status: 'warning' },
]

const logSteps: WorkflowStep[] = [
  {
    id: 'l1',
    title: '工业相机触发拍照',
    type: 'static',
    desc: '6 台相机，多角度同步',
  },
  {
    id: 'l2',
    title: '图像预处理',
    type: 'static',
    desc: '去噪/增强/畸变校正',
    children: [
      { id: 'l2-1', title: '白平衡校正', type: 'static' },
      { id: 'l2-2', title: 'ROI 区域提取', type: 'ai' },
      { id: 'l2-3', title: '去噪滤波', type: 'static' },
    ],
  },
  {
    id: 'l3',
    title: '多模型并行推理',
    type: 'ai',
    desc: '外观/尺寸/划痕 3 模型并发',
  },
  {
    id: 'l4',
    title: '缺陷坐标计算',
    type: 'static',
    desc: '与标准图纸比对',
  },
  { id: 'l5', title: '批量统计与分类', type: 'ai' },
  { id: 'l6', title: '不良数据推送 WMS/MES', type: 'static' },
]

const abnormalSteps: WorkflowStep[] = [
  {
    id: 'a1',
    title: '工业相机触发拍照',
    type: 'static',
    desc: '6 台相机，多角度同步',
  },
  {
    id: 'a2',
    title: '图像预处理',
    type: 'static',
    desc: '去噪/增强/畸变校正',
  },
  {
    id: 'a3',
    title: '多模型并行推理',
    type: 'ai',
    desc: '外观/尺寸/划痕 3 模型并发',
  },
  {
    id: 'a4',
    title: '缺陷坐标计算',
    type: 'static',
    desc: '与标准图纸比对',
  },
  { id: 'a5', title: '批量统计与分类', type: 'ai' },
  { id: 'a6', title: '不良数据推送 WMS/MES', type: 'static' },
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
    title="视觉质检智能体"
    subtitle="AI 视觉缺陷检测与分级"
    :nodes="nodes"
    :kpis="kpis"
    :records="records"
    :log-steps="logSteps"
    :abnormal-steps="abnormalSteps"
  />
</template>
