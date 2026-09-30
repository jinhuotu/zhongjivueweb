<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Download, History, LoaderCircle, RefreshCw, ShieldAlert } from 'lucide-vue-next'
import { Panel, PageHeader, KpiCard, Tag } from '@/components/ui-kit'
import { ApiError } from '@/lib/api'
import {
  exportAuditCsv,
  fetchAuditSummary,
  fetchChatAuditDetail,
  fetchChatAudits,
  fetchDataQueryLogs,
  fetchHotConfigAudits,
  fetchKnowledgeAudits,
  fetchLoginLogs,
  fetchOperationLogs,
  type AuditSummary,
  type ChatAuditDetail,
  type ChatAuditItem,
  type DataQueryLogItem,
  type HotConfigAuditItem,
  type KnowledgeAuditItem,
  type LoginLogItem,
  type OperationLogItem,
} from '@/lib/audit-api'

type TabKey = 'operations' | 'logins' | 'chats' | 'queries' | 'knowledge' | 'hotconfigs'

const PAGE_SIZE = 50

const MODULE_LABEL: Record<string, string> = {
  users: '用户',
  roles: '角色',
  hot_configs: '热配置',
  mcp: 'MCP',
  models: '模型',
  knowledge: '知识库',
  workflows: '工作流',
  governance: '治理任务',
  prompts: '提示词',
  agents: '智能体',
  ai: '问答',
}

const ACTION_LABEL: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  reset_password: '重置密码',
  health: '健康检查',
  refresh_tools: '刷新工具',
  update_tool: '更新工具',
  delete_session: '删除会话',
  create_base: '创建知识库',
  update_base: '修改知识库',
  delete_base: '删除知识库',
  acl_update: '修改授权',
  upload_doc: '上传文档',
  publish: '发布',
  run: '运行',
  update_graph: '更新图',
  export_excel: '导出 Excel',
}

const REASON_LABEL: Record<string, string> = {
  ok: '成功',
  invalid_credentials: '账号或密码错误',
  inactive: '账号已停用',
}

const tab = ref<TabKey>('operations')
const loading = ref(true)
const exporting = ref(false)
const error = ref('')
const summary = ref<AuditSummary | null>(null)
const page = ref(1)

const operations = ref<OperationLogItem[]>([])
const opTotal = ref(0)
const logins = ref<LoginLogItem[]>([])
const loginTotal = ref(0)
const chats = ref<ChatAuditItem[]>([])
const chatTotal = ref(0)
const chatDetail = ref<ChatAuditDetail | null>(null)
const queries = ref<DataQueryLogItem[]>([])
const queryTotal = ref(0)
const knowledgeLogs = ref<KnowledgeAuditItem[]>([])
const knowledgeTotal = ref(0)
const hotConfigs = ref<HotConfigAuditItem[]>([])
const hotConfigTotal = ref(0)

const fromLocal = ref('')
const toLocal = ref('')
const moduleFilter = ref('')
const opSuccessFilter = ref<'all' | 'ok' | 'fail'>('all')
const opKeyword = ref('')
const loginSuccessFilter = ref<'all' | 'ok' | 'fail'>('all')
const loginUsername = ref('')
const chatUsername = ref('')
const chatKeyword = ref('')
const querySource = ref('')
const querySuccess = ref<'all' | 'ok' | 'fail'>('all')
const queryKeyword = ref('')
const kbAction = ref('')
const kbKeyword = ref('')
const hotAction = ref('')
const hotKeyword = ref('')

const currentTotal = computed(() => {
  if (tab.value === 'operations') return opTotal.value
  if (tab.value === 'logins') return loginTotal.value
  if (tab.value === 'chats') return chatTotal.value
  if (tab.value === 'queries') return queryTotal.value
  if (tab.value === 'hotconfigs') return hotConfigTotal.value
  return knowledgeTotal.value
})

const pageCount = computed(() => Math.max(1, Math.ceil(currentTotal.value / PAGE_SIZE)))

function formatTime(ts: number | null | undefined): string {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function boolFilter(v: 'all' | 'ok' | 'fail'): boolean | undefined {
  if (v === 'ok') return true
  if (v === 'fail') return false
  return undefined
}

function localToMs(value: string): number | undefined {
  const raw = value.trim()
  if (!raw) return undefined
  const ms = new Date(raw).getTime()
  return Number.isFinite(ms) ? ms : undefined
}

function rangeParams() {
  return {
    fromMs: localToMs(fromLocal.value),
    toMs: localToMs(toLocal.value),
  }
}

function offsetOf() {
  return (page.value - 1) * PAGE_SIZE
}

async function reload() {
  loading.value = true
  error.value = ''
  try {
    const range = rangeParams()
    const sum = await fetchAuditSummary()
    summary.value = sum

    if (tab.value === 'operations') {
      const opList = await fetchOperationLogs({
        module: moduleFilter.value || undefined,
        success: boolFilter(opSuccessFilter.value),
        keyword: opKeyword.value.trim() || undefined,
        ...range,
        limit: PAGE_SIZE,
        offset: offsetOf(),
      })
      operations.value = opList.items || []
      opTotal.value = opList.total || 0
    } else if (tab.value === 'logins') {
      const loginList = await fetchLoginLogs({
        success: boolFilter(loginSuccessFilter.value),
        username: loginUsername.value.trim() || undefined,
        ...range,
        limit: PAGE_SIZE,
        offset: offsetOf(),
      })
      logins.value = loginList.items || []
      loginTotal.value = loginList.total || 0
    } else if (tab.value === 'chats') {
      const chatList = await fetchChatAudits({
        username: chatUsername.value.trim() || undefined,
        keyword: chatKeyword.value.trim() || undefined,
        ...range,
        limit: PAGE_SIZE,
        offset: offsetOf(),
      })
      chats.value = chatList.items || []
      chatTotal.value = chatList.total || 0
      if (chatDetail.value && !chats.value.some((row) => row.id === chatDetail.value?.id)) {
        chatDetail.value = null
      }
    } else if (tab.value === 'queries') {
      const queryList = await fetchDataQueryLogs({
        source: querySource.value || undefined,
        success: boolFilter(querySuccess.value),
        keyword: queryKeyword.value.trim() || undefined,
        ...range,
        limit: PAGE_SIZE,
        offset: offsetOf(),
      })
      queries.value = queryList.items || []
      queryTotal.value = queryList.total || 0
    } else if (tab.value === 'hotconfigs') {
      const list = await fetchHotConfigAudits({
        action: hotAction.value || undefined,
        keyword: hotKeyword.value.trim() || undefined,
        ...range,
        limit: PAGE_SIZE,
        offset: offsetOf(),
      })
      hotConfigs.value = list.items || []
      hotConfigTotal.value = list.total || 0
    } else {
      const kbList = await fetchKnowledgeAudits({
        action: kbAction.value || undefined,
        keyword: kbKeyword.value.trim() || undefined,
        ...range,
        limit: PAGE_SIZE,
        offset: offsetOf(),
      })
      knowledgeLogs.value = kbList.items || []
      knowledgeTotal.value = kbList.total || 0
    }
  } catch (e) {
    error.value =
      e instanceof ApiError || e instanceof Error ? e.message : '加载日志失败'
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  void reload()
}

async function doExport() {
  exporting.value = true
  error.value = ''
  try {
    const range = rangeParams()
    if (tab.value === 'operations') {
      await exportAuditCsv('operations', {
        module: moduleFilter.value || undefined,
        success: boolFilter(opSuccessFilter.value),
        keyword: opKeyword.value.trim() || undefined,
        from: range.fromMs,
        to: range.toMs,
      })
    } else if (tab.value === 'logins') {
      await exportAuditCsv('logins', {
        success: boolFilter(loginSuccessFilter.value),
        username: loginUsername.value.trim() || undefined,
        from: range.fromMs,
        to: range.toMs,
      })
    } else if (tab.value === 'chats') {
      await exportAuditCsv('chats', {
        username: chatUsername.value.trim() || undefined,
        keyword: chatKeyword.value.trim() || undefined,
        from: range.fromMs,
        to: range.toMs,
      })
    } else if (tab.value === 'queries') {
      await exportAuditCsv('queries', {
        source: querySource.value || undefined,
        success: boolFilter(querySuccess.value),
        keyword: queryKeyword.value.trim() || undefined,
        from: range.fromMs,
        to: range.toMs,
      })
    } else if (tab.value === 'hotconfigs') {
      await exportAuditCsv('hot-configs', {
        action: hotAction.value || undefined,
        keyword: hotKeyword.value.trim() || undefined,
        from: range.fromMs,
        to: range.toMs,
      })
    } else {
      await exportAuditCsv('knowledge', {
        action: kbAction.value || undefined,
        keyword: kbKeyword.value.trim() || undefined,
        from: range.fromMs,
        to: range.toMs,
      })
    }
  } catch (e) {
    error.value = e instanceof ApiError || e instanceof Error ? e.message : '导出失败'
  } finally {
    exporting.value = false
  }
}

onMounted(reload)
watch(tab, () => {
  page.value = 1
  chatDetail.value = null
  void reload()
})
watch(
  [moduleFilter, opSuccessFilter, loginSuccessFilter, querySource, querySuccess, kbAction, hotAction],
  () => {
    page.value = 1
    void reload()
  },
)

async function openChat(row: ChatAuditItem) {
  error.value = ''
  try {
    const data = await fetchChatAuditDetail(row.id)
    chatDetail.value = data.item
  } catch (e) {
    error.value = e instanceof ApiError || e instanceof Error ? e.message : '加载问答详情失败'
  }
}

function prevPage() {
  if (page.value <= 1) return
  page.value -= 1
  void reload()
}

function nextPage() {
  if (page.value >= pageCount.value) return
  page.value += 1
  void reload()
}
</script>

<template>
  <PageHeader
    title="审计日志"
    description="统一检索操作、登录、问答、数据查询与知识库变更；支持时间范围、分页与 CSV 导出。操作/登录按运维窗口滚动清理；问答、查询与知识库变更按合规窗口保留。"
  >
    <template #badges>
      <Tag tone="molybdenum">运维 {{ summary?.retentionDays ?? 7 }} 天</Tag>
      <Tag tone="patina">合规 {{ summary?.traceRetentionDays ?? 180 }} 天</Tag>
    </template>
    <template #actions>
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent"
        :disabled="loading || exporting"
        @click="doExport"
      >
        <Download class="size-3.5" />
        导出 CSV
      </button>
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent"
        :disabled="loading"
        @click="reload"
      >
        <RefreshCw class="size-3.5" :class="loading ? 'animate-spin' : ''" />
        刷新
      </button>
    </template>
  </PageHeader>

  <p v-if="error" class="mb-4 text-xs text-iron">{{ error }}</p>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <KpiCard
      :label="`近 ${summary?.retentionDays ?? 7} 天操作`"
      :value="String(summary?.operationTotal ?? 0)"
      unit="条"
      tone="molybdenum"
    >
      <template #icon><History class="size-4" /></template>
    </KpiCard>
    <KpiCard
      label="操作失败"
      :value="String(summary?.operationFail ?? 0)"
      unit="条"
      tone="iron"
    >
      <template #icon><ShieldAlert class="size-4" /></template>
    </KpiCard>
    <KpiCard
      :label="`近 ${summary?.retentionDays ?? 7} 天登录`"
      :value="String(summary?.loginTotal ?? 0)"
      unit="次"
      tone="patina"
    />
    <KpiCard
      label="合规侧总量"
      :value="String((summary?.knowledgeTotal ?? 0) + (summary?.queryTotal ?? 0) + (summary?.chatSessionTotal ?? 0) + (summary?.hotConfigTotal ?? 0))"
      unit="条"
      tone="molybdenum"
    />
  </div>

  <div class="mb-4 flex flex-wrap items-center gap-2 text-xs">
    <label class="text-muted-foreground">开始</label>
    <input
      v-model="fromLocal"
      type="datetime-local"
      class="h-8 px-2 text-xs rounded-md border border-border bg-background"
    />
    <label class="text-muted-foreground">结束</label>
    <input
      v-model="toLocal"
      type="datetime-local"
      class="h-8 px-2 text-xs rounded-md border border-border bg-background"
    />
    <button
      type="button"
      class="h-8 px-3 text-xs rounded-md border border-border hover:bg-accent"
      @click="search"
    >
      按时间筛选
    </button>
  </div>

  <div class="mb-4 flex flex-wrap items-center gap-1 text-xs">
    <button
      v-for="item in [
        { key: 'operations', label: '操作日志' },
        { key: 'logins', label: '登录日志' },
        { key: 'chats', label: '问答记录' },
        { key: 'queries', label: '数据查询' },
        { key: 'knowledge', label: '知识库修改' },
        { key: 'hotconfigs', label: '热配置变更' },
      ]"
      :key="item.key"
      type="button"
      class="h-8 px-3 rounded-md border"
      :class="
        tab === item.key
          ? 'bg-iron/15 border-iron/30 text-iron'
          : 'border-border text-muted-foreground'
      "
      @click="tab = item.key as TabKey"
    >
      {{ item.label }}
    </button>
  </div>

  <Panel
    v-if="tab === 'operations'"
    title="写入操作"
    :subtitle="`共 ${opTotal} 条 · 第 ${page}/${pageCount} 页`"
    flush
  >
    <div class="px-4 py-3 flex flex-wrap gap-2 border-b border-border">
      <select
        v-model="moduleFilter"
        class="h-8 px-2 text-xs rounded-md border border-border bg-background"
      >
        <option value="">全部模块</option>
        <option v-for="(label, key) in MODULE_LABEL" :key="key" :value="key">{{ label }}</option>
      </select>
      <select
        v-model="opSuccessFilter"
        class="h-8 px-2 text-xs rounded-md border border-border bg-background"
      >
        <option value="all">全部结果</option>
        <option value="ok">成功</option>
        <option value="fail">失败</option>
      </select>
      <input
        v-model="opKeyword"
        class="h-8 px-2 text-xs rounded-md border border-border bg-background min-w-[180px]"
        placeholder="路径 / 操作人 / 资源 / RequestId"
        @keydown.enter="search"
      />
      <button
        type="button"
        class="h-8 px-3 text-xs rounded-md border border-border hover:bg-accent"
        @click="search"
      >
        查询
      </button>
    </div>
    <div v-if="loading" class="px-4 py-6 text-xs text-muted-foreground inline-flex items-center gap-1.5">
      <LoaderCircle class="size-3.5 animate-spin" />加载中…
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs min-w-[1100px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in ['时间', '模块', '动作', '操作人', 'IP', '结果', '路径', 'RequestId', '耗时']"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="!operations.length">
            <td colspan="9" class="px-4 py-8 text-center text-muted-foreground">暂无操作记录</td>
          </tr>
          <tr v-for="row in operations" :key="row.id" class="hover:bg-background/40">
            <td class="px-4 py-2.5 data-num whitespace-nowrap">{{ formatTime(row.createdAt) }}</td>
            <td class="px-4 py-2.5">{{ MODULE_LABEL[row.module] || row.module }}</td>
            <td class="px-4 py-2.5">{{ ACTION_LABEL[row.action] || row.action }}</td>
            <td class="px-4 py-2.5">
              {{ row.operatorUsername || '—' }}
              <div v-if="row.operatorId" class="text-[10px] text-muted-foreground">#{{ row.operatorId }}</div>
            </td>
            <td class="px-4 py-2.5 data-num">{{ row.ip || '—' }}</td>
            <td class="px-4 py-2.5">
              <Tag :tone="row.success ? 'patina' : 'iron'">
                {{ row.success ? '成功' : `失败 ${row.statusCode}` }}
              </Tag>
              <div v-if="row.detail" class="mt-1 text-[10px] text-muted-foreground max-w-[220px] truncate">
                {{ row.detail }}
              </div>
            </td>
            <td class="px-4 py-2.5">
              <div class="data-num">{{ row.method }} {{ row.path }}</div>
              <div v-if="row.resourceId" class="text-[10px] text-muted-foreground mt-0.5">
                资源 {{ row.resourceId }}
              </div>
            </td>
            <td class="px-4 py-2.5 data-num max-w-[140px] truncate" :title="row.requestId">
              {{ row.requestId || '—' }}
            </td>
            <td class="px-4 py-2.5 data-num">{{ row.durationMs }} ms</td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>

  <Panel
    v-else-if="tab === 'logins'"
    title="登录记录"
    :subtitle="`共 ${loginTotal} 条 · 第 ${page}/${pageCount} 页`"
    flush
  >
    <div class="px-4 py-3 flex flex-wrap gap-2 border-b border-border">
      <select
        v-model="loginSuccessFilter"
        class="h-8 px-2 text-xs rounded-md border border-border bg-background"
      >
        <option value="all">全部结果</option>
        <option value="ok">成功</option>
        <option value="fail">失败</option>
      </select>
      <input
        v-model="loginUsername"
        class="h-8 px-2 text-xs rounded-md border border-border bg-background min-w-[160px]"
        placeholder="用户名"
        @keydown.enter="search"
      />
      <button
        type="button"
        class="h-8 px-3 text-xs rounded-md border border-border hover:bg-accent"
        @click="search"
      >
        查询
      </button>
    </div>
    <div v-if="loading" class="px-4 py-6 text-xs text-muted-foreground inline-flex items-center gap-1.5">
      <LoaderCircle class="size-3.5 animate-spin" />加载中…
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs min-w-[860px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in ['时间', '用户名', '结果', '原因', 'IP', 'User-Agent']"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="!logins.length">
            <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">暂无登录记录</td>
          </tr>
          <tr v-for="row in logins" :key="row.id" class="hover:bg-background/40">
            <td class="px-4 py-2.5 data-num whitespace-nowrap">{{ formatTime(row.createdAt) }}</td>
            <td class="px-4 py-2.5">{{ row.username }}</td>
            <td class="px-4 py-2.5">
              <Tag :tone="row.success ? 'patina' : 'iron'">
                {{ row.success ? '成功' : '失败' }}
              </Tag>
            </td>
            <td class="px-4 py-2.5">{{ REASON_LABEL[row.reason] || row.reason || '—' }}</td>
            <td class="px-4 py-2.5 data-num">{{ row.ip || '—' }}</td>
            <td class="px-4 py-2.5 text-muted-foreground max-w-[360px] truncate" :title="row.userAgent">
              {{ row.userAgent || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>

  <Panel
    v-else-if="tab === 'chats'"
    title="问答记录"
    :subtitle="`共 ${chatTotal} 条 · 第 ${page}/${pageCount} 页（含用户已删除会话）`"
    flush
  >
    <div class="px-4 py-3 flex flex-wrap gap-2 border-b border-border">
      <input
        v-model="chatUsername"
        class="h-8 px-2 text-xs rounded-md border border-border bg-background min-w-[140px]"
        placeholder="用户名"
        @keydown.enter="search"
      />
      <input
        v-model="chatKeyword"
        class="h-8 px-2 text-xs rounded-md border border-border bg-background min-w-[180px]"
        placeholder="标题或消息内容"
        @keydown.enter="search"
      />
      <button
        type="button"
        class="h-8 px-3 text-xs rounded-md border border-border hover:bg-accent"
        @click="search"
      >
        查询
      </button>
    </div>
    <div v-if="loading" class="px-4 py-6 text-xs text-muted-foreground inline-flex items-center gap-1.5">
      <LoaderCircle class="size-3.5 animate-spin" />加载中…
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs min-w-[860px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in ['更新时间', '用户', '标题', '消息数', '状态', '']"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="!chats.length">
            <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">暂无问答记录</td>
          </tr>
          <tr v-for="row in chats" :key="row.id" class="hover:bg-background/40">
            <td class="px-4 py-2.5 data-num whitespace-nowrap">{{ formatTime(row.updatedAt) }}</td>
            <td class="px-4 py-2.5">{{ row.username }}</td>
            <td class="px-4 py-2.5">{{ row.title }}</td>
            <td class="px-4 py-2.5 data-num">{{ row.messageCount }}</td>
            <td class="px-4 py-2.5">
              <Tag :tone="row.deleted ? 'iron' : 'patina'">{{ row.deleted ? '已删除' : '有效' }}</Tag>
            </td>
            <td class="px-4 py-2.5">
              <button type="button" class="text-iron hover:underline" @click="openChat(row)">查看</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="chatDetail" class="border-t border-border px-4 py-3 space-y-3">
      <div class="text-xs font-medium">
        {{ chatDetail.title }} · {{ chatDetail.username }}
        <span v-if="chatDetail.deleted" class="text-iron">（用户已删除，审计保留）</span>
      </div>
      <div class="max-h-72 overflow-y-auto space-y-2">
        <div
          v-for="msg in chatDetail.messages"
          :key="msg.id"
          class="text-xs rounded-md border border-border px-3 py-2"
        >
          <div class="text-[10px] text-muted-foreground mb-1">
            {{ msg.role }}<span v-if="msg.toolName"> · {{ msg.toolName }}</span>
            · {{ formatTime(msg.createdAt) }}
          </div>
          <div class="whitespace-pre-wrap break-words">{{ msg.content || '—' }}</div>
        </div>
      </div>
      <div v-if="chatDetail.relatedQueries?.length" class="text-xs">
        <div class="font-medium mb-1">关联数据查询</div>
        <div class="space-y-1">
          <div
            v-for="q in chatDetail.relatedQueries"
            :key="q.id"
            class="rounded-md border border-border px-3 py-2"
          >
            <div class="text-[10px] text-muted-foreground">
              {{ formatTime(q.createdAt) }} · {{ q.source }} · {{ q.requestId || '无 RequestId' }}
            </div>
            <div>{{ q.toolName || q.queryText }}</div>
          </div>
        </div>
      </div>
    </div>
  </Panel>

  <Panel
    v-else-if="tab === 'queries'"
    title="数据查询"
    :subtitle="`共 ${queryTotal} 条 · 第 ${page}/${pageCount} 页`"
    flush
  >
    <div class="px-4 py-3 flex flex-wrap gap-2 border-b border-border">
      <select v-model="querySource" class="h-8 px-2 text-xs rounded-md border border-border bg-background">
        <option value="">全部来源</option>
        <option value="knowledge">知识库检索</option>
        <option value="mcp">MCP 工具</option>
      </select>
      <select v-model="querySuccess" class="h-8 px-2 text-xs rounded-md border border-border bg-background">
        <option value="all">全部结果</option>
        <option value="ok">成功</option>
        <option value="fail">失败</option>
      </select>
      <input
        v-model="queryKeyword"
        class="h-8 px-2 text-xs rounded-md border border-border bg-background min-w-[180px]"
        placeholder="查询内容 / 工具 / 用户 / 会话"
        @keydown.enter="search"
      />
      <button
        type="button"
        class="h-8 px-3 text-xs rounded-md border border-border hover:bg-accent"
        @click="search"
      >
        查询
      </button>
    </div>
    <div v-if="loading" class="px-4 py-6 text-xs text-muted-foreground inline-flex items-center gap-1.5">
      <LoaderCircle class="size-3.5 animate-spin" />加载中…
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs min-w-[1080px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in ['时间', '来源', '查询人', '内容', '结果', '耗时', '会话', 'RequestId']"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="!queries.length">
            <td colspan="8" class="px-4 py-8 text-center text-muted-foreground">暂无查询记录</td>
          </tr>
          <tr v-for="row in queries" :key="row.id" class="hover:bg-background/40">
            <td class="px-4 py-2.5 data-num whitespace-nowrap">{{ formatTime(row.createdAt) }}</td>
            <td class="px-4 py-2.5">{{ row.source === 'knowledge' ? '知识库' : 'MCP' }}</td>
            <td class="px-4 py-2.5">{{ row.operatorUsername || '—' }}</td>
            <td class="px-4 py-2.5 max-w-[280px]">
              <div class="truncate" :title="row.queryText">{{ row.toolName || row.queryText }}</div>
              <div v-if="row.resultSummary" class="text-[10px] text-muted-foreground truncate">
                {{ row.resultSummary }}
              </div>
            </td>
            <td class="px-4 py-2.5">
              <Tag :tone="row.success ? 'patina' : 'iron'">{{ row.success ? '成功' : '失败' }}</Tag>
            </td>
            <td class="px-4 py-2.5 data-num">{{ row.durationMs }} ms</td>
            <td class="px-4 py-2.5 data-num">{{ row.sessionId || '—' }}</td>
            <td class="px-4 py-2.5 data-num max-w-[140px] truncate" :title="row.requestId">
              {{ row.requestId || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>

  <Panel
    v-else-if="tab === 'hotconfigs'"
    title="热配置变更"
    :subtitle="`共 ${hotConfigTotal} 条 · 第 ${page}/${pageCount} 页（含 before/after）`"
    flush
  >
    <div class="px-4 py-3 flex flex-wrap gap-2 border-b border-border">
      <select v-model="hotAction" class="h-8 px-2 text-xs rounded-md border border-border bg-background">
        <option value="">全部动作</option>
        <option value="create">创建</option>
        <option value="update">更新</option>
        <option value="delete">删除</option>
      </select>
      <input
        v-model="hotKeyword"
        class="h-8 px-2 text-xs rounded-md border border-border bg-background min-w-[180px]"
        placeholder="配置键 / 新旧值 / 备注"
        @keydown.enter="search"
      />
      <button
        type="button"
        class="h-8 px-3 text-xs rounded-md border border-border hover:bg-accent"
        @click="search"
      >
        查询
      </button>
    </div>
    <div v-if="loading" class="px-4 py-6 text-xs text-muted-foreground inline-flex items-center gap-1.5">
      <LoaderCircle class="size-3.5 animate-spin" />加载中…
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs min-w-[1080px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in ['时间', '配置键', '动作', '版本', '操作人ID', '变更']"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="!hotConfigs.length">
            <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">暂无热配置变更</td>
          </tr>
          <tr v-for="row in hotConfigs" :key="row.id" class="hover:bg-background/40">
            <td class="px-4 py-2.5 data-num whitespace-nowrap">{{ formatTime(row.createdAt) }}</td>
            <td class="px-4 py-2.5 data-num">{{ row.key }}</td>
            <td class="px-4 py-2.5">{{ ACTION_LABEL[row.action] || row.action }}</td>
            <td class="px-4 py-2.5 data-num">{{ row.version }}</td>
            <td class="px-4 py-2.5 data-num">{{ row.operatorId ?? '—' }}</td>
            <td class="px-4 py-2.5 max-w-[420px]">
              <div v-if="row.oldValue" class="truncate text-muted-foreground" :title="row.oldValue">
                前 {{ row.oldValue }}
              </div>
              <div v-if="row.newValue" class="truncate" :title="row.newValue">后 {{ row.newValue }}</div>
              <div v-if="row.remark" class="text-[10px] text-muted-foreground mt-0.5">{{ row.remark }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>

  <Panel
    v-else
    title="知识库修改"
    :subtitle="`共 ${knowledgeTotal} 条 · 第 ${page}/${pageCount} 页`"
    flush
  >
    <div class="px-4 py-3 flex flex-wrap gap-2 border-b border-border">
      <select v-model="kbAction" class="h-8 px-2 text-xs rounded-md border border-border bg-background">
        <option value="">全部动作</option>
        <option value="create_base">创建知识库</option>
        <option value="update_base">修改知识库</option>
        <option value="delete_base">删除知识库</option>
        <option value="acl_update">修改授权</option>
        <option value="upload_doc">上传文档</option>
        <option value="delete_doc">删除文档</option>
      </select>
      <input
        v-model="kbKeyword"
        class="h-8 px-2 text-xs rounded-md border border-border bg-background min-w-[180px]"
        placeholder="库 ID / 文档 / 操作人 / 变更内容"
        @keydown.enter="search"
      />
      <button
        type="button"
        class="h-8 px-3 text-xs rounded-md border border-border hover:bg-accent"
        @click="search"
      >
        查询
      </button>
    </div>
    <div v-if="loading" class="px-4 py-6 text-xs text-muted-foreground inline-flex items-center gap-1.5">
      <LoaderCircle class="size-3.5 animate-spin" />加载中…
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs min-w-[1080px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in ['时间', '动作', '操作人', '知识库', '文档', 'RequestId', '变更']"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="!knowledgeLogs.length">
            <td colspan="7" class="px-4 py-8 text-center text-muted-foreground">暂无知识库变更</td>
          </tr>
          <tr v-for="row in knowledgeLogs" :key="row.id" class="hover:bg-background/40">
            <td class="px-4 py-2.5 data-num whitespace-nowrap">{{ formatTime(row.createdAt) }}</td>
            <td class="px-4 py-2.5">{{ ACTION_LABEL[row.action] || row.action }}</td>
            <td class="px-4 py-2.5">{{ row.operatorUsername || '—' }}</td>
            <td class="px-4 py-2.5 data-num">{{ row.baseId || '—' }}</td>
            <td class="px-4 py-2.5 data-num">{{ row.docId || '—' }}</td>
            <td class="px-4 py-2.5 data-num max-w-[140px] truncate" :title="row.requestId">
              {{ row.requestId || '—' }}
            </td>
            <td class="px-4 py-2.5 max-w-[360px]">
              <div v-if="row.beforeJson" class="truncate text-muted-foreground" :title="row.beforeJson">
                前 {{ row.beforeJson }}
              </div>
              <div v-if="row.afterJson" class="truncate" :title="row.afterJson">后 {{ row.afterJson }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>

  <div class="mt-3 flex items-center justify-end gap-2 text-xs">
    <button
      type="button"
      class="h-8 px-3 rounded-md border border-border hover:bg-accent disabled:opacity-40"
      :disabled="loading || page <= 1"
      @click="prevPage"
    >
      上一页
    </button>
    <span class="text-muted-foreground">{{ page }} / {{ pageCount }}</span>
    <button
      type="button"
      class="h-8 px-3 rounded-md border border-border hover:bg-accent disabled:opacity-40"
      :disabled="loading || page >= pageCount"
      @click="nextPage"
    >
      下一页
    </button>
  </div>
</template>
