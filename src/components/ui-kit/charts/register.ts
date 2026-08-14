import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart, GaugeChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components'

let registered = false

export function ensureEcharts() {
  use([
    CanvasRenderer,
    LineChart,
    BarChart,
    PieChart,
    GaugeChart,
    ScatterChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
  ])
  registered = true
}
