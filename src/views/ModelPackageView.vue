<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import {
  Package,
  PackageOpen,
  Download,
  CircleCheck,
  Clock,
  FileCode,
  Sparkles,
  Cpu,
  Square,
  Smartphone,
  Network,
  RotateCw,
  ChevronRight,
  Tag as TagIcon,
  Copy,
  ShieldCheck,
  Box,
  type LucideIcon,
} from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import {
  PACKAGE_FORMATS,
  PACKAGE_HISTORY,
  WORKFLOW_TEMPLATES,
  MODELS,
  ITERATION_HISTORY,
} from '@/lib/mock'

const FORMAT_ICON: Record<string, LucideIcon> = {
  skill: Sparkles,
  onnx: Cpu,
  exe: Square,
  app: Smartphone,
  docker: Box,
  api: Network,
}

const COLOR_CLS: Record<string, { text: string; border: string; bg: string }> = {
  iron: { text: 'text-iron', border: 'border-iron/40', bg: 'bg-iron/10' },
  molybdenum: { text: 'text-molybdenum', border: 'border-molybdenum/40', bg: 'bg-molybdenum/10' },
  patina: { text: 'text-patina', border: 'border-patina/40', bg: 'bg-patina/10' },
  sulfur: { text: 'text-sulfur', border: 'border-sulfur/40', bg: 'bg-sulfur/10' },
  coolant: { text: 'text-coolant', border: 'border-coolant/40', bg: 'bg-coolant/10' },
}

const baseFlow = ref('wf-temp')
const format = ref('onnx')
const version = ref('v1.3.0')
const name = ref('KilnTempLSTM30m')
const author = ref('中机六院 · 能碳运维中心 · 算法组')
const license = ref('Apache-2.0')
const progress = ref(0)
const running = ref(false)
const done = ref(false)
const historyFilter = ref('全部')
let timer: number | undefined

const selectedFormat = computed(
  () => PACKAGE_FORMATS.find((f) => f.id === format.value)!,
)
const selectedFlow = computed(
  () => WORKFLOW_TEMPLATES.find((w) => w.id === baseFlow.value)!,
)
const refModel = computed(() => MODELS.find((m) => m.id === 'mdl-temp-lstm'))
const latestIter = computed(() => ITERATION_HISTORY[ITERATION_HISTORY.length - 1])

const summary = computed(
  () =>
    `基于车式窑 30 天 5min 栅格历史数据训练的 ${selectedFlow.value.name}，支持 30 分钟前瞻预测，输入 326 维特征，输出 6 个预测点位 + 置信带。${selectedFormat.value.useCase} 场景就绪。`,
)

const kpis = computed(() => [
  {
    k: '历史产物',
    v: PACKAGE_HISTORY.length,
    sub: '已发布',
    icon: PackageOpen,
    color: 'molybdenum',
  },
  {
    k: '支持格式',
    v: PACKAGE_FORMATS.length,
    sub: 'Skill/EXE/APP/Docker/API/ONNX',
    icon: Package,
    color: 'iron',
  },
  {
    k: '总下载量',
    v: PACKAGE_HISTORY.reduce((s, p) => s + p.downloads, 0),
    sub: '累计 30 天',
    icon: Download,
    color: 'patina',
  },
  {
    k: '已签名',
    v: PACKAGE_HISTORY.filter((p) => p.status === 'released').length,
    sub: '通过审批',
    icon: ShieldCheck,
    color: 'sulfur',
  },
])

const gates = [
  { k: '工作流通过冒烟测试', ok: true },
  { k: '模型 RMSE ≤ 5℃', ok: true },
  { k: '推理延迟 ≤ 300 ms', ok: true },
  { k: '安全扫描（依赖）', ok: true },
  { k: '签名 SHA256', ok: false, hint: '待安全主管审批' },
  { k: '配套测试集 ≥ 1000 样本', ok: true },
]

const filteredHistory = computed(() => {
  if (historyFilter.value === '全部') return PACKAGE_HISTORY
  const fmt = PACKAGE_FORMATS.find((f) => f.name === historyFilter.value)
  if (!fmt) return PACKAGE_HISTORY
  return PACKAGE_HISTORY.filter((p) => p.format === fmt.id)
})

const manifestText = computed(
  () => `{
  "name": "${name.value}",
  "version": "${version.value}",
  "format": "${selectedFormat.value.id}",
  "based_on": {
    "workflow": "${baseFlow.value}",
    "iteration": "${latestIter.value.ver}",
    "rmse": "${latestIter.value.rmse}"
  },
  "io": {
    "inputs": ["T_ts", "Q_ts", "O2_ts", "λ_ts"],
    "outputs": ["T_forecast (6×ts)", "confidence"]
  },
  "runtime": "ONNX 1.16",
  "deps": ["onnxruntime>=1.16", "numpy", "pandas"],
  "license": "${license.value}",
  "author": "中机六院·能碳运维中心·算法组",
  "signature": "sha256:8c3e…f24a (待审批)"
}`,
)

function startExport() {
  if (timer) window.clearInterval(timer)
  running.value = true
  done.value = false
  progress.value = 0
  timer = window.setInterval(() => {
    progress.value += 8 + Math.floor(Math.random() * 4)
    if (progress.value >= 100) {
      progress.value = 100
      if (timer) window.clearInterval(timer)
      timer = undefined
      running.value = false
      done.value = true
    }
  }, 220)
}

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Panel v-for="m in kpis" :key="m.k" flush>
        <div class="p-4">
          <div class="flex items-center justify-between">
            <div class="text-xs text-muted-foreground">{{ m.k }}</div>
            <component :is="m.icon" :class="['size-4', COLOR_CLS[m.color].text]" />
          </div>
          <div class="font-mono text-2xl text-foreground mt-2">{{ m.v }}</div>
          <div class="text-[11px] text-muted-foreground mt-1">{{ m.sub }}</div>
        </div>
      </Panel>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <div class="col-span-12 lg:col-span-7 space-y-4">
        <Panel title="① 选择源工作流" subtitle="基于已通过验证的迭代版本进行封装">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              v-for="wf in WORKFLOW_TEMPLATES"
              :key="wf.id"
              type="button"
              :class="[
                'text-left p-3 rounded border transition',
                baseFlow === wf.id
                  ? `${COLOR_CLS[wf.color].border} ${COLOR_CLS[wf.color].bg}`
                  : 'border-border hover:border-molybdenum/40',
              ]"
              @click="baseFlow = wf.id"
            >
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'text-sm font-medium',
                    baseFlow === wf.id ? COLOR_CLS[wf.color].text : 'text-foreground',
                  ]"
                >
                  {{ wf.name }}
                </span>
                <CircleCheck
                  v-if="baseFlow === wf.id"
                  :class="['size-3.5 ml-auto', COLOR_CLS[wf.color].text]"
                />
              </div>
              <div class="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                {{ wf.desc }}
              </div>
              <div class="flex flex-wrap gap-1 mt-1.5">
                <span
                  v-for="t in wf.tags"
                  :key="t"
                  class="px-1.5 py-0 text-[10px] rounded bg-background border border-border text-muted-foreground"
                >
                  {{ t }}
                </span>
              </div>
            </button>
          </div>
        </Panel>

        <Panel title="② 选择封装格式" subtitle="多端 / 多场景产物形态">
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <button
              v-for="f in PACKAGE_FORMATS"
              :key="f.id"
              type="button"
              :class="[
                'text-left p-3 rounded border transition',
                format === f.id
                  ? `${COLOR_CLS[f.color].border} ${COLOR_CLS[f.color].bg}`
                  : 'border-border hover:border-molybdenum/40',
              ]"
              @click="format = f.id"
            >
              <div class="flex items-center gap-2">
                <component
                  :is="FORMAT_ICON[f.id]"
                  :class="[
                    'size-4',
                    format === f.id ? COLOR_CLS[f.color].text : 'text-muted-foreground',
                  ]"
                />
                <span
                  :class="[
                    'text-sm font-medium',
                    format === f.id ? COLOR_CLS[f.color].text : 'text-foreground',
                  ]"
                >
                  {{ f.name }}
                </span>
                <CircleCheck
                  v-if="format === f.id"
                  :class="['size-3.5 ml-auto', COLOR_CLS[f.color].text]"
                />
              </div>
              <div class="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
                {{ f.desc }}
              </div>
              <div class="text-[10px] text-muted-foreground mt-1 font-mono">
                {{ f.ext }} · {{ f.size }}
              </div>
            </button>
          </div>
        </Panel>

        <Panel title="③ 元信息 & 版本">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <label class="block">
              <span class="text-muted-foreground mb-1.5 block">产物名称</span>
              <input
                v-model="name"
                class="w-full bg-background border border-border rounded px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <label class="block">
              <span class="text-muted-foreground mb-1.5 block">版本号</span>
              <input
                v-model="version"
                class="w-full bg-background border border-border rounded px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <label class="block">
              <span class="text-muted-foreground mb-1.5 block">作者 / 团队</span>
              <input
                v-model="author"
                class="w-full bg-background border border-border rounded px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <label class="block">
              <span class="text-muted-foreground mb-1.5 block">License</span>
              <select
                v-model="license"
                class="w-full bg-background border border-border rounded px-2.5 py-1.5 text-sm text-foreground"
              >
                <option>Apache-2.0</option>
                <option>MIT</option>
                <option>BSD-3</option>
                <option>GPL-3.0</option>
                <option>Proprietary 中机六院专有</option>
              </select>
            </label>
            <label class="block col-span-full">
              <span class="text-muted-foreground mb-1.5 block">摘要 / 用途</span>
              <textarea
                :value="summary"
                rows="2"
                class="w-full bg-background border border-border rounded px-2.5 py-1.5 text-sm text-foreground resize-none"
              />
            </label>
          </div>
        </Panel>

        <Panel title="④ 一键导出">
          <template #action>
            <button
              type="button"
              :disabled="running"
              :class="[
                'px-4 py-2 rounded text-sm inline-flex items-center gap-2',
                running
                  ? 'bg-sulfur/20 text-sulfur cursor-not-allowed'
                  : 'bg-iron/20 text-iron border border-iron/40 hover:brightness-110',
              ]"
              @click="startExport"
            >
              <template v-if="running">
                <RotateCw class="size-4 animate-spin" /> 打包中 {{ progress }}%
              </template>
              <template v-else>
                <Download class="size-4" /> 生成产物
              </template>
            </button>
          </template>

          <div v-if="running || done" class="space-y-3">
            <div class="h-2 bg-background rounded overflow-hidden">
              <div
                class="h-full bg-iron transition-all"
                :style="{ width: `${progress}%` }"
              />
            </div>
            <div class="font-mono text-[11px] space-y-1 text-muted-foreground">
              <div v-if="progress >= 10" class="text-coolant">
                [10%] 拉取工作流 {{ baseFlow }} · 节点 7 · 边 6 …
              </div>
              <div v-if="progress >= 24" class="text-coolant">
                [24%] 数据预处理 Pipeline 序列化 OK
              </div>
              <div v-if="progress >= 40" class="text-molybdenum">
                [40%] 模型权重导出 · TorchScript 编译 OK
              </div>
              <div v-if="progress >= 58" class="text-molybdenum">
                [58%] 转换为 {{ selectedFormat.name }} · 6.8 MB
              </div>
              <div v-if="progress >= 72" class="text-sulfur">
                [72%] 生成依赖清单 requirements.txt · 24 项
              </div>
              <div v-if="progress >= 86" class="text-sulfur">
                [86%] 签名与版本写入 manifest.json
              </div>
              <div v-if="progress >= 96" class="text-patina">
                [96%] 自检通过 · RMSE 4.2℃ · 准入门控 ✓
              </div>
              <div v-if="done" class="text-patina">
                [100%] ✅ 产物 {{ name }}-{{ version }}{{ selectedFormat.ext }} 已生成
              </div>
            </div>
            <div
              v-if="done"
              class="flex flex-wrap items-center gap-2 pt-2 border-t border-border"
            >
              <Package class="size-4 text-iron" />
              <span class="text-sm text-foreground font-mono">
                {{ name }}-{{ version }}{{ selectedFormat.ext }}
              </span>
              <span class="text-xs text-muted-foreground">{{ selectedFormat.size }}</span>
              <button
                type="button"
                class="ml-auto px-3 py-1 text-xs rounded border border-patina/40 bg-patina/10 text-patina inline-flex items-center gap-1"
              >
                <Download class="size-3" /> 下载
              </button>
              <button
                type="button"
                class="px-3 py-1 text-xs rounded border border-border text-muted-foreground inline-flex items-center gap-1"
              >
                <Copy class="size-3" /> 复制链接
              </button>
            </div>
          </div>
          <div
            v-else
            class="text-center py-8 text-muted-foreground text-sm"
          >
            <PackageOpen class="size-10 mx-auto mb-3 text-iron/40" />
            确认以上参数后，点击右上「生成产物」开始封装
          </div>
        </Panel>
      </div>

      <div class="col-span-12 lg:col-span-5 space-y-4">
        <Panel
          title="封装预览"
          :subtitle="`${name}-${version}${selectedFormat.ext}`"
          flush
        >
          <div class="p-4 space-y-3">
            <div
              :class="[
                'p-3 rounded border',
                COLOR_CLS[selectedFormat.color].border,
                COLOR_CLS[selectedFormat.color].bg,
              ]"
            >
              <div class="flex items-center gap-3">
                <component
                  :is="FORMAT_ICON[selectedFormat.id]"
                  :class="['size-8', COLOR_CLS[selectedFormat.color].text]"
                />
                <div class="flex-1">
                  <div
                    :class="[
                      'text-lg font-semibold',
                      COLOR_CLS[selectedFormat.color].text,
                    ]"
                  >
                    {{ selectedFormat.name }}
                  </div>
                  <div class="text-xs text-muted-foreground mt-0.5">
                    {{ selectedFormat.desc }}
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                <div>
                  <div class="text-muted-foreground">格式</div>
                  <div class="text-foreground font-mono">{{ selectedFormat.ext }}</div>
                </div>
                <div>
                  <div class="text-muted-foreground">体积</div>
                  <div class="text-foreground font-mono">{{ selectedFormat.size }}</div>
                </div>
                <div>
                  <div class="text-muted-foreground">场景</div>
                  <div class="text-foreground">{{ selectedFormat.useCase }}</div>
                </div>
              </div>
            </div>

            <div>
              <div class="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <FileCode class="size-3" /> manifest.json 预览
              </div>
              <pre
                class="text-[10px] font-mono bg-background border border-border rounded p-3 text-muted-foreground overflow-x-auto leading-relaxed"
              >{{ manifestText }}</pre>
            </div>

            <div>
              <div class="text-xs text-muted-foreground mb-1.5">I/O Schema</div>
              <div class="grid grid-cols-2 gap-2 text-[11px]">
                <div class="p-2 rounded bg-background border border-border">
                  <div class="text-coolant font-medium mb-1">↓ INPUTS</div>
                  <div class="space-y-1 text-muted-foreground font-mono">
                    <div>T_ts · Float32 · [lookback,1]</div>
                    <div>Q_ts · Float32 · [lookback,1]</div>
                    <div>O2_ts · Float32 · [lookback,1]</div>
                    <div>λ_ts · Float32 · [lookback,1]</div>
                  </div>
                </div>
                <div class="p-2 rounded bg-background border border-border">
                  <div class="text-iron font-medium mb-1">↑ OUTPUTS</div>
                  <div class="space-y-1 text-muted-foreground font-mono">
                    <div>T_forecast · [6, 1]</div>
                    <div>conf_upper · [6, 1]</div>
                    <div>conf_lower · [6, 1]</div>
                    <div>warning_flag · int</div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="refModel">
              <div class="text-xs text-muted-foreground mb-1.5">关联模型</div>
              <div class="p-2 rounded bg-background border border-border text-[11px]">
                <div class="flex items-center gap-2 flex-wrap">
                  <TagIcon class="size-3 text-molybdenum" />
                  <span class="text-foreground font-medium">{{ refModel.name }}</span>
                  <span class="text-muted-foreground">{{ refModel.type }}</span>
                  <span class="ml-auto text-patina font-mono">{{ refModel.metric }}</span>
                </div>
                <div class="text-muted-foreground mt-1 line-clamp-1">{{ refModel.desc }}</div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="自检与门控" subtitle="导出前必须满足的 6 项准入条件">
          <div class="space-y-1.5 text-xs">
            <div
              v-for="r in gates"
              :key="r.k"
              class="flex items-center gap-2 py-1"
            >
              <CircleCheck v-if="r.ok" class="size-4 text-patina" />
              <Clock v-else class="size-4 text-sulfur" />
              <span class="text-muted-foreground flex-1">{{ r.k }}</span>
              <span v-if="r.hint" class="text-[10px] text-sulfur">{{ r.hint }}</span>
              <ChevronRight class="size-3 text-muted-foreground" />
            </div>
          </div>
        </Panel>
      </div>
    </div>

    <Panel title="历史封装产物" subtitle="近 30 天发布记录">
      <template #action>
        <div class="flex items-center gap-2 text-xs">
          <span class="text-muted-foreground">类型筛选：</span>
          <select
            v-model="historyFilter"
            class="bg-background border border-border rounded px-2 py-1 text-muted-foreground"
          >
            <option>全部</option>
            <option v-for="f in PACKAGE_FORMATS" :key="f.id" :value="f.name">
              {{ f.name }}
            </option>
          </select>
        </div>
      </template>

      <div class="overflow-x-auto -mx-4">
        <table class="w-full text-sm">
          <thead class="text-muted-foreground text-xs uppercase border-b border-border">
            <tr>
              <th class="text-left py-2 px-4">编号</th>
              <th class="text-left py-2 px-2">名称</th>
              <th class="text-left py-2 px-2">版本</th>
              <th class="text-left py-2 px-2">格式</th>
              <th class="text-left py-2 px-2">源工作流</th>
              <th class="text-right py-2 px-2">体积</th>
              <th class="text-right py-2 px-2">下载</th>
              <th class="text-center py-2 px-2">状态</th>
              <th class="text-right py-2 px-4">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in filteredHistory"
              :key="p.id"
              class="border-b border-border/40 hover:bg-background/40"
            >
              <td class="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                {{ p.id }}
              </td>
              <td class="py-2.5 px-2 text-foreground font-medium">{{ p.name }}</td>
              <td class="py-2.5 px-2 font-mono text-muted-foreground">{{ p.ver }}</td>
              <td class="py-2.5 px-2">
                <span
                  v-if="PACKAGE_FORMATS.find((f) => f.id === p.format)"
                  :class="[
                    'px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1',
                    COLOR_CLS[PACKAGE_FORMATS.find((f) => f.id === p.format)!.color].bg,
                    COLOR_CLS[PACKAGE_FORMATS.find((f) => f.id === p.format)!.color].text,
                  ]"
                >
                  <component
                    :is="FORMAT_ICON[p.format]"
                    class="size-3"
                  />
                  {{ PACKAGE_FORMATS.find((f) => f.id === p.format)!.name.split(' ')[0] }}
                </span>
              </td>
              <td class="py-2.5 px-2 text-muted-foreground text-xs">
                {{
                  WORKFLOW_TEMPLATES.find((w) => w.id === p.baseFlow)?.name ??
                  p.baseFlow
                }}
              </td>
              <td class="py-2.5 px-2 text-right font-mono text-muted-foreground text-xs">
                {{ p.size }}
              </td>
              <td class="py-2.5 px-2 text-right font-mono text-foreground text-xs">
                {{ p.downloads }}
              </td>
              <td class="py-2.5 px-2 text-center">
                <span
                  v-if="p.status === 'released'"
                  class="px-2 py-0.5 text-[10px] rounded bg-patina/20 text-patina"
                >
                  RELEASED
                </span>
                <span
                  v-else
                  class="px-2 py-0.5 text-[10px] rounded bg-sulfur/20 text-sulfur"
                >
                  BETA
                </span>
              </td>
              <td class="py-2.5 px-4 text-right">
                <button
                  type="button"
                  class="text-xs text-molybdenum hover:underline inline-flex items-center gap-1"
                >
                  <Download class="size-3" /> 下载
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  </div>
</template>
