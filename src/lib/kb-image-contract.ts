/**
 * 知识库图片契约常量。OCR 文本检索 + 命中后展示原图。
 */

import { getAccessToken } from '@/lib/auth'

export const KB_IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] as const

export type KbImageExt = (typeof KB_IMAGE_EXTS)[number]

export const KB_IMAGE_KIND = 'image' as const

export const KB_IMAGE_PREVIEW_KIND = 'image' as const

/** 默认 200MB；实际上限以后端 KB_UPLOAD_MAX_BYTES 为准 */
export const KB_IMAGE_UPLOAD_MAX_BYTES_DEFAULT = 200 * 1024 * 1024

export const KB_IMAGE_SUMMARY_PENDING = '图片原件（待识别，暂不可检索）'
export const KB_IMAGE_SUMMARY_OCR = '正在识别文字…'
export const KB_IMAGE_SUMMARY_EMBED = '正在写入检索…'

export function isKbImageExt(ext: string | null | undefined): boolean {
  const t = (ext || '').toLowerCase().replace(/^\./, '')
  return (KB_IMAGE_EXTS as readonly string[]).includes(t)
}

export function isKbImageDoc(it: {
  kind?: string | null
  fileType?: string | null
}): boolean {
  if ((it.kind || '') === KB_IMAGE_KIND) return true
  return isKbImageExt(it.fileType)
}

export function isKbImageRef(r: {
  preview_kind?: string | null
  file_type?: string | null
  kind?: string | null
}): boolean {
  if ((r.preview_kind || '') === KB_IMAGE_PREVIEW_KIND) return true
  if ((r.kind || '') === KB_IMAGE_KIND) return true
  return isKbImageExt(r.file_type)
}

/**
 * 原件预览地址。
 * <img src> 需 withToken:true（query access_token），因无法带 Authorization。
 */
export function kbImageFilePath(
  docId: string,
  opts: { baseId: string; withToken?: boolean },
): string {
  const id = String(docId || '').trim()
  const q = new URLSearchParams()
  q.set('baseId', String(opts.baseId || '').trim())
  if (opts.withToken) {
    const t = getAccessToken()
    if (t) q.set('access_token', t)
  }
  return `/api/v1/knowledge/documents/${encodeURIComponent(id)}/file?${q.toString()}`
}

export type KbImageHit = {
  docId: string
  baseId: string
  name: string
  fileType?: string
}

/** 同一 doc 多条 chunk 只留一张原图 */
export function collectKbImageHits(
  refs: Array<{
    doc_id?: string
    kb_id?: string
    kbId?: string
    name?: string
    file_type?: string
    has_file?: boolean
    preview_kind?: string
    kind?: string
  }> | null | undefined,
): KbImageHit[] {
  const best = new Map<string, KbImageHit>()
  for (const r of refs || []) {
    if (!isKbImageRef(r) || r.has_file === false) continue
    const docId = String(r.doc_id || '').trim()
    const baseId = String(r.kb_id || r.kbId || '').trim()
    if (!docId || !baseId) continue
    if (best.has(docId)) continue
    best.set(docId, {
      docId,
      baseId,
      name: (r.name || '').trim() || '图片资料',
      fileType: r.file_type,
    })
  }
  return [...best.values()]
}
