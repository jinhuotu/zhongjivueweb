export type GovTaskStatus = 'draft' | 'imported' | 'in_progress' | 'done';

export type GovTaskStepId =
  | 'create'
  | 'import'
  | 'preview'
  | 'mapping'
  | 'clean'
  | 'quality'
  | 'feature'
  | 'publish';

export type GovTaskStep = {
  id: GovTaskStepId;
  title: string;
  description: string;
  /** done | current | pending | skipped */
  status: 'done' | 'current' | 'pending';
};

export type GovExcelPreview = {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: (string | number | null)[][];
  rowCount: number;
  importedAt: string;
};

export type GovTask = {
  id: string;
  name: string;
  description: string;
  owner: string;
  sourceType: 'excel' | 'opc' | 'api' | 'db';
  status: GovTaskStatus;
  createdAt: string;
  updatedAt: string;
  excel?: GovExcelPreview | null;
};

const STORAGE_KEY = 'zj_gov_tasks_v1';

export const NEXT_WORK_STEPS: Omit<GovTaskStep, 'status'>[] = [
  {
    id: 'create',
    title: '创建任务',
    description: '填写任务名称、负责人与数据来源',
  },
  {
    id: 'import',
    title: '导入 Excel',
    description: '上传或载入已提供的样例 Excel 文件',
  },
  {
    id: 'preview',
    title: '打开查看',
    description: '预览表头与样例行，确认字段可读',
  },
  {
    id: 'mapping',
    title: '字段映射（下一步）',
    description: '将 Excel 列映射到标准点位字典 / 元数据模型',
  },
  {
    id: 'clean',
    title: '数据清洗（下一步）',
    description: '缺失值、异常值、单位换算、时间对齐（本期不执行）',
  },
  {
    id: 'quality',
    title: '质量标注（下一步）',
    description: '打上 GOOD / UNCERTAIN / BAD 等质量码并出具质量报告',
  },
  {
    id: 'feature',
    title: '特征工程（下一步）',
    description: '滑窗统计、派生指标、特征入库',
  },
  {
    id: 'publish',
    title: '发布入库（下一步）',
    description: '写入时序库 / 特征库并登记血缘',
  },
];

export function buildTaskSteps(task: GovTask): GovTaskStep[] {
  const hasExcel = Boolean(task.excel && task.excel.headers.length);
  return NEXT_WORK_STEPS.map((s) => {
    if (s.id === 'create') return { ...s, status: 'done' };
    if (s.id === 'import') {
      return { ...s, status: hasExcel ? 'done' : 'current' };
    }
    if (s.id === 'preview') {
      return {
        ...s,
        status: hasExcel ? 'current' : 'pending',
      };
    }
    // 后续步骤仅展示，本期不执行
    return { ...s, status: 'pending' };
  });
}

export function progressPercent(task: GovTask): number {
  const steps = buildTaskSteps(task);
  const done = steps.filter((s) => s.status === 'done').length;
  // 只把本期可完成的前 3 步计入进度展示，后续步骤作为规划
  const currentPhase = Math.min(done, 3);
  return Math.round((currentPhase / 3) * 100);
}

function uid() {
  return `gov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadGovTasks(): GovTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedTasks();
    const parsed = JSON.parse(raw) as GovTask[];
    return Array.isArray(parsed) ? parsed : seedTasks();
  } catch {
    return seedTasks();
  }
}

export function saveGovTasks(tasks: GovTask[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function createEmptyTask(partial?: Partial<GovTask>): GovTask {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: partial?.name || '',
    description: partial?.description || '',
    owner: partial?.owner || '管理员',
    sourceType: partial?.sourceType || 'excel',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    excel: null,
  };
}

function seedTasks(): GovTask[] {
  const now = new Date().toISOString();
  const demo: GovTask = {
    id: 'gov-demo-001',
    name: '窑炉点位样例治理',
    description: '使用平台提供的样例 Excel，演示导入与查看（清洗等后续步骤仅规划）',
    owner: '管理员',
    sourceType: 'excel',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    excel: null,
  };
  saveGovTasks([demo]);
  return [demo];
}

export const STATUS_LABEL: Record<GovTaskStatus, string> = {
  draft: '草稿',
  imported: '已导入',
  in_progress: '进行中',
  done: '已完成',
};
