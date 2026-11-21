import type { AlgorithmMetadata, AlgorithmOptionValue } from './kiln-studio-api'

export const ALGORITHM_SOURCES = [
  { id: 'all', label: '全部' }, { id: 'builtin', label: '内置算法' },
  { id: 'preset', label: '参数方案' }, { id: 'external', label: '外部已训练模型' },
  { id: 'package', label: '上传算法包' },
] as const

export function algorithmSource(item: AlgorithmMetadata) {
  return item.sourceKind ?? (item.external ? 'external' : item.baseKey ? 'preset' : 'builtin')
}

export function algorithmBadges(item: AlgorithmMetadata) {
  const caps = item.capabilities
  if (!caps) return [{ label: '能力未声明', detail: '当前后端没有返回能力信息，请更新后端后重试。' }]
  const state = { supported: '支持', conditional: '有条件', unsupported: '未适配' }
  return [
    { label: { trainable: '平台可训练', calculated: '直接计算', frozen: '固定模型推理' }[caps.trainingMode], detail: caps.trainingDetail },
    { label: `分钟输出：${state[caps.minuteForecast.status]}`, detail: caps.minuteForecast.detail },
    { label: `ONNX：${state[caps.onnxExport.status]}`, detail: caps.onnxExport.detail },
    { label: `Python：${state[caps.pythonExport.status]}`, detail: caps.pythonExport.detail },
  ]
}

export function algorithmParameterFields(item: AlgorithmMetadata) {
  return Object.entries(item.parameterSchema?.properties ?? {}).map(([key, field]) => ({
    key, ...field, required: item.parameterSchema?.required?.includes(key) ?? false,
  }))
}

export function algorithmParameterDefaults(item: AlgorithmMetadata, saved: Record<string, AlgorithmOptionValue> = {}) {
  return Object.fromEntries(algorithmParameterFields(item).filter(f => f.key in saved || f.default !== undefined)
    .map(f => [f.key, saved[f.key] ?? f.default ?? null]))
}

/** 页面只作即时反馈，最终合法性仍由后端已注册的 Pydantic 模型判断。 */
export function validateAlgorithmParameters(item: AlgorithmMetadata, values: Record<string, AlgorithmOptionValue>) {
  const result: Record<string, AlgorithmOptionValue> = {}
  for (const field of algorithmParameterFields(item)) {
    const value = values[field.key]
    const title = field.title || field.key
    if (value === undefined || value === null || (field.type !== 'string' && value === '')) {
      if (field.required) throw new Error(`请填写${title}`)
      continue
    }
    if (field.enum && !field.enum.includes(value)) throw new Error(`${title}不在允许的选项中`)
    if (field.type === 'number' || field.type === 'integer') {
      if (typeof value !== 'number' || !Number.isFinite(value) || (field.type === 'integer' && !Number.isInteger(value))) throw new Error(`${title}需要有效${field.type === 'integer' ? '整数' : '数字'}`)
      if ((field.minimum !== undefined && value < field.minimum) || (field.maximum !== undefined && value > field.maximum) || (field.exclusiveMinimum !== undefined && value <= field.exclusiveMinimum) || (field.exclusiveMaximum !== undefined && value >= field.exclusiveMaximum)) throw new Error(`${title}超出允许范围`)
    } else if (typeof value !== field.type) throw new Error(`${title}的类型不正确`)
    if (typeof value === 'string' && ((field.minLength !== undefined && value.length < field.minLength) || (field.maxLength !== undefined && value.length > field.maxLength))) throw new Error(`${title}长度不符合要求`)
    result[field.key] = value
  }
  return result
}
