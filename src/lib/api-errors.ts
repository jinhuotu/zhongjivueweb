const fieldNames: Record<string, string> = {
  datasetId: '数据版本', mechanismId: '机理版本', task: '预测任务', zone: '温区',
  horizonMinutes: '预测提前量', historyMinutes: '历史窗口', ridgeAlpha: '岭回归参数',
  boostingRounds: '提升树轮数', learningRate: '学习率', calibrate: '重新标定',
  excludeZeroTemperatureRecords: '全零温度处理规则', lockedParameters: '锁定参数',
  selectedAlgorithmKeys: '参选算法',
  comparePlans: '温度方案对比', holdMinutes: '偏移保持时间', targetC: '目标温度',
}

/** Read FastAPI validation locations/messages without exposing request input values. */
export function apiErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const body = payload as Record<string, unknown>
  if (typeof body.msg === 'string' && body.msg.trim()) return body.msg.trim()
  if (typeof body.detail === 'string' && body.detail.trim()) return body.detail.trim()
  if (!Array.isArray(body.detail)) return undefined
  const messages = body.detail.slice(0, 3).flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return []
    const issue = item as Record<string, unknown>
    const location = Array.isArray(issue.loc) ? issue.loc.filter(part =>
      typeof part === 'string' || typeof part === 'number') : []
    const key = location.find(part => typeof part === 'string' && part in fieldNames)
    const name = typeof key === 'string' ? `${fieldNames[key]}（${key}）`
      : location.filter(part => !['body', 'query', 'path'].includes(String(part))).join('.') || '请求内容'
    if (issue.type === 'extra_forbidden' && key === 'excludeZeroTemperatureRecords') {
      return [`${name}：当前后端尚不支持，请重启 API 服务加载最新代码后重试`]
    }
    if (issue.type === 'extra_forbidden' && key === 'comparePlans') {
      return [`${name}：请重启 API 服务加载新版对比接口后重试`]
    }
    const reason = issue.type === 'extra_forbidden' ? '后端不接受此字段，请检查前后端版本'
      : issue.type === 'missing' ? '缺少必填值'
      : typeof issue.msg === 'string' ? issue.msg : '格式或取值不符合要求'
    return [`${name}：${reason}`]
  })
  return messages.length ? '请求参数校验失败：' + messages.join('；') : undefined
}
