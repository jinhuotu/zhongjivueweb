export type WorkflowNodeStatus =
  | 'done'
  | 'current'
  | 'pending'
  | 'warning'
  | 'error'

export type WorkflowNode = {
  id: string
  label: string
  status: WorkflowNodeStatus
  detail?: {
    time?: string
    operator?: string
    remark?: string
  }
}

export type WorkflowStepType = 'static' | 'ai' | 'branch' | 'loop'

export type WorkflowStep = {
  id: string
  title: string
  desc?: string
  type: WorkflowStepType
  children?: WorkflowStep[]
}

export type FullWorkflowNodeType =
  | 'static'
  | 'ai'
  | 'branch'
  | 'merge'
  | 'loop'

export type FullWorkflowNodeStatus = 'done' | 'running' | 'pending' | 'error'

export type FullWorkflowNode = {
  id: string
  title: string
  type: FullWorkflowNodeType
  x: number
  y: number
  width?: number
  status?: FullWorkflowNodeStatus
}

export type FullWorkflowEdge = {
  id: string
  from: string
  to: string
  label?: string
  type?: 'static' | 'dynamic'
}
