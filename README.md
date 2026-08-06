# 中机六院设备能碳 · Vue 重构版

从 `aizhongjiweb`（Next.js + React）迁移到 Vue 3 的前端项目。

## 技术栈

- Vue 3 + TypeScript + Vite
- Vue Router + Pinia
- Tailwind CSS v4（沿用原项目 Furnace Control Room 主题）
- lucide-vue-next

## 开发

```bash
npm install
npm run dev
```

默认地址：http://localhost:5173

后端 API（与 React 版一致）：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

开发默认账号：`admin` / `Admin@123456`

## 当前进度

已完成：

- 工程脚手架与主题样式
- 登录鉴权（JWT Access / Refresh）
- AppShell：侧栏 / 顶栏 / 多标签
- **能碳总览 / 实时态势**
- **生产侧 SCADA**（隧道窑 / 配料 / 梭式窑）+ 车式窑监控 + 设备资产
- **AI 智能问答**（SSE 流式）+ **AI 智能报告**
- **知识库**（列表 / 详情 / 上传 / 3D 预览）
- **模型管理 / 用户与权限**
- **数据治理**（Excel 导入）
- **低代码采集 / 低代码决策分析**

待迁移：能耗 / 碳侧 / APS / 质量 / 故障等 mock 仪表盘、模型封装导出、统计报表/告警/设置等。
