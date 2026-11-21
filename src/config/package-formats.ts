export type PackageFormat = {
  id: string; name: string; extension: string; purpose: string
  available: boolean; format?: 'json' | 'skill' | 'python' | 'onnx'; prerequisite?: string
  download?: 'json' | 'zip'
}

// 页面骨架只消费此配置；新增格式时在此登记并接入后端实现。
export const PACKAGE_EXPORT_FORMATS: readonly PackageFormat[] = [
  { id: 'json', name: '数值模型 JSON', extension: '.model.json', purpose: '保存完整权重、参数和数据口径，供平台或自有系统读取。', available: true, format: 'json' },
  { id: 'skill', name: 'AI Skill JSON', extension: '.skill.json', purpose: '携带输入、输出和调用规格，供智能体集成；内嵌完整模型。', available: true, format: 'skill' },
  { id: 'python', name: 'Python 离线推理包', extension: '.python.zip', purpose: '包含模型、NumPy 推理脚本、真实输入示例及使用说明。', available: true, format: 'python', download: 'zip' },
  { id: 'onnx', name: '通用 ONNX 部署包', extension: '.onnx.zip', purpose: 'FP32 模型、独立 CPU 运行程序及逐点核对报告；保留已训练的分钟预测输出。', available: true, format: 'onnx', download: 'zip' },
  { id: 'tensorrt', name: 'TensorRT 加速 / INT8 量化', extension: '.engine', purpose: 'NVIDIA 边缘设备加速。', available: false, prerequisite: '待明确目标 GPU、运行环境和校准数据，并完成精度与性能实测。' },
  { id: 'pmml', name: 'PMML', extension: '.pmml', purpose: '与支持 PMML 的系统交换模型。', available: false, prerequisite: '需新增 PMML 转换与兼容性验证。' },
  { id: 'docker', name: 'Docker', extension: '.tar', purpose: '容器化部署。', available: false, prerequisite: '需提供镜像构建、运行环境及镜像分发能力。' },
  { id: 'api', name: 'HTTP API', extension: 'OpenAPI', purpose: '通过服务调用预测。', available: false, prerequisite: '需新增独立推理服务的部署、鉴权及运维能力。' },
  { id: 'exe', name: 'Windows EXE', extension: '.exe', purpose: '在 Windows 工控机运行。', available: false, prerequisite: '需新增可执行文件打包及目标环境测试。' },
  { id: 'app', name: '移动 APP', extension: '.apk / .ipa', purpose: '移动端应用集成。', available: false, prerequisite: '需开发移动客户端并接入推理能力。' },
]
