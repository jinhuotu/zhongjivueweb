import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart, GaugeChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components'

let registered = false

export function ensureEcharts() {
  if (registered) return
  use([
    CanvasRenderer,
    LineChart,
    BarChart,
    PieChart,
    GaugeChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
  ])
  registered = true
}
