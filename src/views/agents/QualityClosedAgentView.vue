<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangle, Clock, Users } from 'lucide-vue-next'
import { Panel, Tag } from '@/components/ui-kit'
import RingWorkflow from '@/components/agents/RingWorkflow.vue'
import WorkflowLogPanel from '@/components/agents/WorkflowLogPanel.vue'
import type { WorkflowNode, WorkflowStep } from '@/components/agents/types'

type RingNode = WorkflowNode & {
  handler: string
  deadline: string
}

const selectedNode = ref('n3')

const ringNodes: RingNode[] = [
  { id: 'n1', label: '不良上报', status: 'done', handler: '张工', deadline: '已完成' },
  { id: 'n2', label: '自动派单', status: 'done', handler: '智能体', deadline: '已完成' },
  { id: 'n3', label: '隔离管控', status: 'current', handler: '李工', deadline: '剩余 2h' },
  { id: 'n4', label: '方案制定', status: 'pending', handler: '王工', deadline: '今日 18:00' },
  { id: 'n5', label: '整改执行', status: 'pending', handler: '赵工', deadline: '明日 12:00' },
  { id: 'n6', label: '复检验证', status: 'pending', handler: '质检组', deadline: '后日 10:00' },
  { id: 'n7', label: '关闭归档', status: 'pending', handler: '质量主管', deadline: '后日 18:00' },
]

const active = computed(
  () => ringNodes.find((n) => n.id === selectedNode.value) || ringNodes[2]!,
)

const logSteps: WorkflowStep[] = [
  {
    id: 'l1',
    title: '不良问题上报登记',
    type: 'static',
    desc: '表面裂纹，批次 B202607-28',
  },
  {
    id: 'l2',
    title: '智能体自动分级判定',
    type: 'ai',
    desc: '判定等级：一般质量问题',
    children: [
      { id: 'l2-1', title: '调取历史同类案例', type: 'branch' },
      { id: 'l2-2', title: '严重程度模型评估', type: 'ai' },
      { id: 'l2-3', title: '关联影响范围分析', type: 'static' },
    ],
  },
  {
    id: 'l3',
    title: '自动分配责任人',
    type: 'ai',
    desc: '基于技能/负荷/班次派单',
  },
  {
    id: 'l4',
    title: '临时隔离管控指令',
    type: 'static',
    desc: '冻结同批次 320 件物料',
  },
  {
    id: 'l5',
    title: '推送整改参考方案',
    type: 'ai',
    desc: '匹配 3 条历史成功案例',
  },
  { id: 'l6', title: '整改执行跟踪', type: 'static' },
  {
    id: 'l7',
    title: '逾期自动催办/升级',
    type: 'branch',
    desc: '超 8h 上报主管',
  },
  { id: 'l8', title: '复检验收', type: 'static' },
  { id: 'l9', title: '数据同步至根因库/追溯台账', type: 'static' },
  { id: 'l10', title: '问题关闭归档', type: 'static' },
]

const issues = [
  ['QR-003', '表面裂纹', '一般', '隔离管控', '李工', '2h', '进行中'],
  ['QR-002', '尺寸超差', '一般', '整改执行', '赵工', '5h', '进行中'],
  ['QR-001', '成分偏差', '严重', '方案制定', '王工', '1天', '进行中'],
  ['QR-004', '外观划伤', '轻微', '复检验证', '质检组', '4h', '进行中'],
  ['QR-005', '硬度不足', '严重', '隔离管控', '李工', '已逾期', '逾期'],
] as const

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-hairline bg-transparent hover:bg-bg-surface/60 transition-colors'
const btnPrimary =
  'inline-flex items-center justify-center h-7 px-2.5 text-xs rounded border border-transparent bg-iron text-white hover:brightness-110 transition-colors flex-1'

function levelTone(level: string) {
  if (level === '严重') return 'iron' as const
  if (level === '一般') return 'sulfur' as const
  return 'patina' as const
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-semibold">
          质量闭环智能体
          <span class="text-sm text-muted-foreground font-normal"
            >· PDCA 质量问题闭环管理</span
          >
        </h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          完整展示上报→处置→验证→关闭全闭环（合规审厂要求）
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Tag tone="sulfur" class-name="gap-1">
          <AlertTriangle class="size-3" />进行中 5 件
        </Tag>
        <button type="button" :class="btnPrimary.replace('flex-1', '')">
          新建问题
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <Panel
          title="问题闭环进度 · QR-20260728-003"
          subtitle="表面裂纹 · 批次 B202607-28 · 一般质量问题"
        >
          <RingWorkflow
            :nodes="ringNodes"
            :selected-id="selectedNode"
            @node-click="selectedNode = $event"
          />
        </Panel>
      </div>

      <div class="space-y-3">
        <Panel title="节点详情">
          <div class="space-y-3 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">当前阶段</span>
              <Tag tone="molybdenum">{{ active.label }}</Tag>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">责任人</span>
              <div class="flex items-center gap-1.5">
                <Users class="size-3.5" />{{ active.handler }}
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">处理时限</span>
              <div class="flex items-center gap-1 text-sulfur">
                <Clock class="size-3.5" />{{ active.deadline }}
              </div>
            </div>
            <div class="pt-2 border-t border-hairline">
              <div class="text-muted-foreground mb-2">操作</div>
              <div class="flex gap-2">
                <button type="button" :class="btnPrimary">确认接收</button>
                <button type="button" :class="[btn, 'flex-1 justify-center']">
                  上报延期
                </button>
              </div>
            </div>
          </div>
        </Panel>

        <WorkflowLogPanel
          title="AI 调度日志"
          :steps="logSteps"
          :default-open="false"
        />
      </div>
    </div>

    <Panel
      title="在办质量问题列表"
      subtitle="共 5 件进行中，3 件逾期预警"
    >
      <table class="w-full text-xs">
        <thead class="text-muted-foreground border-b border-hairline">
          <tr>
            <th class="text-left py-2 font-medium">问题编号</th>
            <th class="text-left font-medium">问题描述</th>
            <th class="text-left font-medium">等级</th>
            <th class="text-left font-medium">当前阶段</th>
            <th class="text-left font-medium">责任人</th>
            <th class="text-left font-medium">剩余时间</th>
            <th class="text-left font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in issues"
            :key="row[0]"
            class="border-b border-hairline/50"
          >
            <td class="py-2 font-mono">{{ row[0] }}</td>
            <td>{{ row[1] }}</td>
            <td>
              <Tag :tone="levelTone(row[2])">{{ row[2] }}</Tag>
            </td>
            <td>{{ row[3] }}</td>
            <td>{{ row[4] }}</td>
            <td :class="row[5] === '已逾期' ? 'text-iron font-medium' : ''">
              {{ row[5] }}
            </td>
            <td>
              <Tag v-if="row[5] === '已逾期'" tone="iron" class-name="gap-1">
                <AlertTriangle class="size-3" />逾期
              </Tag>
              <Tag v-else tone="molybdenum" class-name="gap-1">
                <Clock class="size-3" />{{ row[6] }}
              </Tag>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>
  </div>
</template>
