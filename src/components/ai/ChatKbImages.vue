<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  X,
} from 'lucide-vue-next'
import { kbImageFilePath, type KbImageHit } from '@/lib/kb-image-contract'
import { downloadKnowledgeDocument } from '@/lib/knowledge-api'
import { ApiError } from '@/lib/api'

const props = defineProps<{
  images: KbImageHit[]
}>()

const errById = ref<Record<string, string>>({})
const dlBusy = ref<string | null>(null)
const openIndex = ref<number | null>(null)

const current = computed(() => {
  const i = openIndex.value
  if (i == null) return null
  return props.images[i] ?? null
})

function srcOf(img: KbImageHit) {
  return kbImageFilePath(img.docId, { baseId: img.baseId, withToken: true })
}

function onImgErr(img: KbImageHit) {
  errById.value = {
    ...errById.value,
    [img.docId]: '图片加载失败，请确认已登录且有知识库查看权限',
  }
}

async function download(img: KbImageHit) {
  dlBusy.value = img.docId
  try {
    await downloadKnowledgeDocument(img.baseId, img.docId, img.name)
  } catch (e) {
    errById.value = {
      ...errById.value,
      [img.docId]: e instanceof ApiError ? e.message : '下载失败',
    }
  } finally {
    dlBusy.value = null
  }
}

function openAt(i: number) {
  const row = props.images[i]
  if (!row || errById.value[row.docId]) return
  openIndex.value = i
}

function close() {
  openIndex.value = null
}

function prev() {
  if (openIndex.value == null || props.images.length < 2) return
  openAt((openIndex.value + props.images.length - 1) % props.images.length)
}

function next() {
  if (openIndex.value == null || props.images.length < 2) return
  openAt((openIndex.value + 1) % props.images.length)
}

function onKey(e: KeyboardEvent) {
  if (openIndex.value == null) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prev()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    next()
  }
}

watch(openIndex, (v) => {
  document.body.style.overflow = v == null ? '' : 'hidden'
})

watch(openIndex, (v, _, onCleanup) => {
  if (v == null) return
  window.addEventListener('keydown', onKey)
  onCleanup(() => window.removeEventListener('keydown', onKey))
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div v-if="images.length" class="space-y-1.5">
    <div class="text-[11px] text-text-muted inline-flex items-center gap-1">
      <ImageIcon class="size-3.5" />
      知识库原图 · 点击可预览 / 下载
    </div>
    <div class="flex flex-wrap gap-2">
      <div
        v-for="(img, i) in images"
        :key="img.docId"
        class="group relative overflow-hidden rounded-md border border-hairline bg-bg-elevated"
      >
        <button
          v-if="!errById[img.docId]"
          type="button"
          class="block cursor-zoom-in"
          :title="`查看原图 ${img.name}`"
          @click="openAt(i)"
        >
          <img
            :src="srcOf(img)"
            :alt="img.name"
            class="h-24 w-[140px] bg-white object-contain"
            @error="onImgErr(img)"
          />
        </button>
        <p
          v-else
          class="flex h-24 w-[140px] items-center px-2 text-center text-[11px] text-iron"
        >
          {{ errById[img.docId] }}
        </p>
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] text-white"
        >
          {{ img.name }}
        </div>
        <div
          class="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        >
          <button
            type="button"
            class="inline-flex size-7 items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80"
            title="预览"
            @click="openAt(i)"
          >
            <Maximize2 class="size-3.5" />
          </button>
          <button
            type="button"
            class="inline-flex size-7 items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80 disabled:opacity-60"
            title="下载"
            :disabled="dlBusy === img.docId"
            @click.stop="download(img)"
          >
            <Loader2 v-if="dlBusy === img.docId" class="size-3.5 animate-spin" />
            <Download v-else class="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="current && openIndex != null"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-bg-base/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      @click.self="close"
    >
      <div
        class="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-lg border border-hairline bg-bg-elevated shadow-2xl"
      >
        <div class="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
          <div class="min-w-0 truncate text-[13px] font-medium text-text-primary">
            {{ current.name }}
            <span v-if="images.length > 1" class="ml-2 text-[11px] font-normal text-text-muted">
              {{ openIndex + 1 }} / {{ images.length }}
            </span>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline px-2.5 text-[12px] text-text-secondary hover:bg-hairline/40 hover:text-text-primary disabled:opacity-60"
              :disabled="dlBusy === current.docId"
              @click="download(current)"
            >
              <Loader2 v-if="dlBusy === current.docId" class="size-3.5 animate-spin" />
              <Download v-else class="size-3.5" />
              下载原图
            </button>
            <button
              type="button"
              class="inline-flex size-8 items-center justify-center rounded-md hover:bg-hairline/60"
              aria-label="关闭"
              @click="close"
            >
              <X class="size-4" />
            </button>
          </div>
        </div>
        <div
          class="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-bg-base/40 p-3"
        >
          <button
            v-if="images.length > 1"
            type="button"
            class="absolute left-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-hairline bg-bg-elevated/90"
            aria-label="上一张"
            @click="prev"
          >
            <ChevronLeft class="size-5" />
          </button>
          <img
            :src="srcOf(current)"
            :alt="current.name"
            class="max-h-[78vh] max-w-full rounded-md border border-hairline bg-white object-contain"
          />
          <button
            v-if="images.length > 1"
            type="button"
            class="absolute right-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-hairline bg-bg-elevated/90"
            aria-label="下一张"
            @click="next"
          >
            <ChevronRight class="size-5" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
