<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  CircleCheck,
  Clock,
  Download,
  Eye,
  FileChartColumn,
  FileText,
  LoaderCircle,
  Plus,
} from 'lucide-vue-next'
import { Panel, PageHeader, KpiCard, Tag } from '@/components/ui-kit'
import {
  downloadBizReport,
  fetchBizReport,
  fetchBizReports,
  fetchReportTemplates,
  generateBizReport,
  type BizReportItem,
  type BizReportSummary,
  type BizReportTemplate,
} from '@/lib/reports-api'

const loading = ref(true)
const generating = ref(false)
const error = ref('')
const preview = ref<string | null>(null)
const previewTitle = ref('')
const items = ref<BizReportItem[]>([])
const templates = ref<BizReportTemplate[]>([])
const summary = ref<BizReportSummary | null>(null)

function typeTone(type: string): 'iron' | 'molybdenum' | 'patina' {
  if (type === '专项') return 'iron'
  if (type === '月报') return 'molybdenum'
  return 'patina'
}

async function reload() {
  loading.value = true
  error.value = ''
  try {
    const [list, tpls] = await Promise.all([
      fetchBizReports({ limit: 50 }),
      fetchReportTemplates(),
    ])
    items.value = list.items || []
    summary.value = list.summary
    templates.value = tpls
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载报表失败'
  } finally {
    loading.value = false
  }
}

async function onGenerate(tpl?: BizReportTemplate) {
  generating.value = true
  error.value = ''
  try {
    await generateBizReport(
      tpl ? { templateKey: tpl.key, templateName: tpl.name } : { templateKey: 'daily' },
    )
    await reload()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '生成失败'
  } finally {
    generating.value = false
  }
}

async function onPreview(r: BizReportItem) {
  if (r.status !== 'ready') return
  error.value = ''
  try {
    const full = await fetchBizReport(r.id)
    previewTitle.value = full.title
    preview.value = full.content || '（空内容）'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '预览失败'
  }
}

async function onDownload(r: BizReportItem) {
  if (r.status !== 'ready') return
  try {
    await downloadBizReport(r.id, `${r.title}.md`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '下载失败'
  }
}

onMounted(reload)
</script>

<template>
  <PageHeader
    title="统计报表"
    description="按内部经营与监管报送要求生成可审计的能碳统计报表（基于台账与工况样本）。AI 叙事类请用「AI 智能报告」。"
  >
    <template #actions>
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent disabled:opacity-50"
        disabled
        title="模板由系统预置，后续开放自定义"
      >
        <Plus class="size-3.5" />新建模板
      </button>
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md bg-iron text-background hover:bg-iron/90 disabled:opacity-50"
        :disabled="generating"
        @click="onGenerate()"
      >
        <LoaderCircle v-if="generating" class="size-3.5 animate-spin" />
        <FileChartColumn v-else class="size-3.5" />
        立即生成
      </button>
    </template>
  </PageHeader>

  <p v-if="error" class="mb-4 text-xs text-iron">{{ error }}</p>
  <div v-if="loading" class="mb-4 text-xs text-muted-foreground inline-flex items-center gap-1.5">
    <LoaderCircle class="size-3.5 animate-spin" />加载中…
  </div>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <KpiCard
      label="累计报表"
      :value="String(summary?.totalCount ?? 0)"
      unit="份"
      tone="molybdenum"
    >
      <template #icon><FileText class="size-4" /></template>
    </KpiCard>
    <KpiCard
      label="本月已生成"
      :value="String(summary?.monthGenerated ?? 0)"
      unit="份"
      tone="patina"
    />
    <KpiCard
      label="待审核"
      :value="String(summary?.pendingReview ?? 0)"
      unit="份"
      tone="sulfur"
    />
    <KpiCard
      label="自动化覆盖"
      :value="String(summary?.automationCoverage ?? 0)"
      unit="%"
      tone="coolant"
      hint="ready / 全部"
    />
  </div>

  <Panel title="报表模板" subtitle="点击模板立即生成" class-name="mb-5">
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <button
        v-for="t in templates"
        :key="t.key"
        type="button"
        class="rounded-md panel-elevated p-4 hover:border-iron/40 transition text-center disabled:opacity-50"
        :disabled="generating"
        @click="onGenerate(t)"
      >
        <div
          class="size-9 rounded-md bg-iron/15 border border-iron/30 mx-auto flex items-center justify-center text-iron font-semibold text-sm data-num"
        >
          {{ t.icon }}
        </div>
        <div class="text-sm font-medium mt-2.5">{{ t.name }}</div>
        <div class="text-[10px] text-muted-foreground mt-1 leading-relaxed">{{ t.desc }}</div>
      </button>
    </div>
  </Panel>

  <Panel title="历史报表" flush>
    <div class="overflow-x-auto">
      <table class="w-full text-xs min-w-[900px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in [
                '编号',
                '名称',
                '类型',
                '统计周期',
                '大小',
                '创建人',
                '生成时间',
                '状态',
                '操作',
              ]"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="!items.length">
            <td colspan="9" class="px-4 py-8 text-center text-muted-foreground">
              暂无报表，点击「立即生成」或上方模板创建一份。
            </td>
          </tr>
          <tr v-for="r in items" :key="r.id" class="hover:bg-background/40">
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.id }}</td>
            <td class="px-4 py-3 font-medium">{{ r.title }}</td>
            <td class="px-4 py-3">
              <Tag :tone="typeTone(r.type)">{{ r.type }}</Tag>
            </td>
            <td class="px-4 py-3 data-num text-foreground/80">{{ r.period }}</td>
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.size }}</td>
            <td class="px-4 py-3 text-foreground/80">{{ r.createdBy }}</td>
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.createdAt }}</td>
            <td class="px-4 py-3">
              <span
                v-if="r.status === 'ready'"
                class="inline-flex items-center gap-1 text-patina"
              >
                <CircleCheck class="size-3" />可下载
              </span>
              <span
                v-else-if="r.status === 'pending_review'"
                class="inline-flex items-center gap-1 text-sulfur"
              >
                <Clock class="size-3" />待审核
              </span>
              <span v-else class="inline-flex items-center gap-1 text-sulfur">
                <Clock class="size-3" />{{ r.status === 'generating' ? '生成中' : r.status }}
              </span>
            </td>
            <td class="px-4 py-3">
              <button
                type="button"
                class="inline-flex items-center gap-1 text-iron hover:underline disabled:opacity-40"
                :disabled="r.status !== 'ready'"
                @click="onPreview(r)"
              >
                <Eye class="size-3" />预览
              </button>
              <span class="text-border mx-1.5">|</span>
              <button
                type="button"
                class="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                :disabled="r.status !== 'ready'"
                @click="onDownload(r)"
              >
                <Download class="size-3" />下载
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>

  <div
    v-if="preview !== null"
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    @click.self="preview = null"
  >
    <div class="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-lg bg-background border border-border p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold">{{ previewTitle }}</h3>
        <button type="button" class="text-xs text-muted-foreground hover:text-foreground" @click="preview = null">
          关闭
        </button>
      </div>
      <pre class="text-xs whitespace-pre-wrap font-mono text-foreground/90">{{ preview }}</pre>
    </div>
  </div>
</template>
