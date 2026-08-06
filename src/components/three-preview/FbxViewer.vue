<script setup lang="ts">
/**
 * FBX 三维图纸预览（纯 three.js）
 * 支持 .fbx / .obj / .gltf / .glb / .stl
 */
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type * as THREE from 'three'
import {
  Loader2,
  RotateCcw,
  Box as BoxIcon,
  Layers,
  AlertTriangle,
  Maximize2,
  Eye,
  EyeOff,
} from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    url: string
    fileType?: string
    height?: number | string
    fallbackHint?: string
  }>(),
  { height: 480 },
)

type LoadState =
  | { status: 'loading'; progress: number }
  | { status: 'ready'; vertices: number; meshes: number }
  | { status: 'error'; msg: string }

const containerRef = ref<HTMLDivElement | null>(null)
const state = ref<LoadState>({ status: 'loading', progress: 0 })
const wireframe = ref(false)
const autoRotate = ref(true)

type ViewerApi = {
  resetView: () => void
  setWireframe: (on: boolean) => void
  setAutoRotate: (on: boolean) => void
  dispose: () => void
}

let api: ViewerApi | null = null
let runId = 0

async function initViewer() {
  const container = containerRef.value
  if (!container) return
  const myRun = ++runId
  state.value = { status: 'loading', progress: 0 }
  wireframe.value = false
  autoRotate.value = true

  const isStale = () => myRun !== runId

  try {
    const THREE = await import('three')
    const stdlib = await import('three-stdlib')
    if (isStale()) return
    const { OrbitControls, FBXLoader, OBJLoader, GLTFLoader, STLLoader } = stdlib

    const width = container.clientWidth
    const heightPx = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x08132a)

    scene.add(new THREE.AmbientLight(0x6a8eb8, 0.55))
    const key = new THREE.DirectionalLight(0xffd5a8, 0.95)
    key.position.set(5, 10, 7)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x4a9eff, 0.45)
    fill.position.set(-6, 4, -4)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0xff6b35, 0.3)
    rim.position.set(0, -6, -8)
    scene.add(rim)

    const grid = new THREE.GridHelper(40, 40, 0x1f3a6b, 0x162a52)
    ;(grid.material as THREE.LineBasicMaterial).transparent = true
    ;(grid.material as THREE.LineBasicMaterial).opacity = 0.6
    scene.add(grid)

    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 5000)
    camera.position.set(8, 6, 10)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, heightPx)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.8

    const ext = (
      props.fileType ||
      props.url.split('?')[0].split('.').pop() ||
      'fbx'
    ).toLowerCase()

    const onProgress = (evt: ProgressEvent) => {
      if (isStale()) return
      if (evt.lengthComputable) {
        state.value = {
          status: 'loading',
          progress: Math.round((evt.loaded / evt.total) * 100),
        }
      }
    }

    const onLoaded = (object: THREE.Object3D) => {
      if (isStale()) return
      const bbox = new THREE.Box3().setFromObject(object)
      const size = new THREE.Vector3()
      const center = new THREE.Vector3()
      bbox.getSize(size)
      bbox.getCenter(center)
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      const scale = 6 / maxDim
      object.scale.setScalar(scale)
      object.position.set(
        -center.x * scale,
        -center.y * scale + size.y * scale * 0.5,
        -center.z * scale,
      )

      let meshCount = 0
      let vertexCount = 0
      object.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          meshCount++
          const mesh = child as THREE.Mesh
          const geom = mesh.geometry as THREE.BufferGeometry
          if (geom?.attributes?.position) {
            vertexCount += geom.attributes.position.count
          }
          if (!Array.isArray(mesh.material)) {
            const old = mesh.material as THREE.Material & { color?: THREE.Color }
            const mat = new THREE.MeshStandardMaterial({
              color: old?.color ?? new THREE.Color('#a4b3c9'),
              metalness: 0.55,
              roughness: 0.45,
            })
            mesh.material = mat
          }
          mesh.castShadow = false
          mesh.receiveShadow = false
        }
      })

      scene.add(object)
      camera.lookAt(0, size.y * scale * 0.4, 0)
      controls.target.set(0, size.y * scale * 0.4, 0)
      controls.update()

      state.value = {
        status: 'ready',
        vertices: vertexCount,
        meshes: meshCount,
      }
    }

    const onError = (err: unknown) => {
      if (isStale()) return
      const msg = err instanceof Error ? err.message : String(err)
      state.value = { status: 'error', msg }
    }

    if (ext === 'fbx') {
      new FBXLoader().load(props.url, onLoaded, onProgress, onError)
    } else if (ext === 'obj') {
      new OBJLoader().load(props.url, onLoaded, onProgress, onError)
    } else if (ext === 'gltf' || ext === 'glb') {
      new GLTFLoader().load(props.url, (gltf) => onLoaded(gltf.scene), onProgress, onError)
    } else if (ext === 'stl') {
      new STLLoader().load(
        props.url,
        (geometry) => {
          const mat = new THREE.MeshStandardMaterial({
            color: 0xa4b3c9,
            metalness: 0.55,
            roughness: 0.45,
          })
          const mesh = new THREE.Mesh(geometry, mat)
          onLoaded(mesh)
        },
        onProgress,
        onError,
      )
    } else {
      onError(new Error(`暂不支持的三维格式：${ext}`))
    }

    let frameId = 0
    const animate = () => {
      if (isStale()) return
      controls.update()
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    const ro = new ResizeObserver(() => {
      if (isStale()) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(container)

    const localApi: ViewerApi = {
      resetView: () => {
        camera.position.set(8, 6, 10)
        controls.target.set(0, 0, 0)
        controls.update()
      },
      setWireframe: (on) => {
        scene.traverse((obj: THREE.Object3D) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m: THREE.Material) => {
                ;(m as THREE.MeshStandardMaterial).wireframe = on
              })
            } else {
              ;(mesh.material as THREE.MeshStandardMaterial).wireframe = on
            }
          }
        })
      },
      setAutoRotate: (on) => {
        controls.autoRotate = on
      },
      dispose: () => {
        cancelAnimationFrame(frameId)
        ro.disconnect()
        controls.dispose()
        renderer.dispose()
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement)
        }
        scene.traverse((obj: THREE.Object3D) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh
            mesh.geometry?.dispose()
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m: THREE.Material) => m.dispose())
            } else {
              mesh.material?.dispose()
            }
          }
        })
      },
    }

    if (isStale()) {
      localApi.dispose()
      return
    }
    api = localApi
  } catch (err) {
    if (!isStale()) {
      state.value = {
        status: 'error',
        msg: err instanceof Error ? err.message : '初始化 3D 引擎失败',
      }
    }
  }
}

function destroyViewer() {
  runId++
  api?.dispose()
  api = null
}

function toggleWireframe() {
  const next = !wireframe.value
  wireframe.value = next
  api?.setWireframe(next)
}

function toggleAutoRotate() {
  const next = !autoRotate.value
  autoRotate.value = next
  api?.setAutoRotate(next)
}

function reset() {
  api?.resetView()
}

const heightStyle = () =>
  typeof props.height === 'number' ? `${props.height}px` : props.height

onMounted(() => {
  void initViewer()
})

onUnmounted(() => {
  destroyViewer()
})

watch(
  () => [props.url, props.fileType] as const,
  () => {
    destroyViewer()
    void initViewer()
  },
  { flush: 'post' },
)
</script>

<template>
  <div
    class="relative rounded-md overflow-hidden border border-hairline bg-bg-base"
    :style="{ height: heightStyle() }"
  >
    <div ref="containerRef" class="w-full h-full" />

    <div
      class="absolute top-2 right-2 flex items-center gap-1.5 bg-bg-elevated/80 backdrop-blur-sm border border-hairline rounded-md px-1.5 py-1 z-10"
    >
      <button
        type="button"
        :title="autoRotate ? '暂停自动旋转' : '开启自动旋转'"
        class="size-7 rounded hover:bg-hairline/60 inline-flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
        @click="toggleAutoRotate"
      >
        <EyeOff v-if="autoRotate" class="size-3.5" />
        <Eye v-else class="size-3.5" />
      </button>
      <button
        type="button"
        :title="wireframe ? '关闭线框' : '开启线框'"
        class="size-7 rounded inline-flex items-center justify-center transition-colors"
        :class="
          wireframe
            ? 'bg-molybdenum/20 text-molybdenum'
            : 'hover:bg-hairline/60 text-text-secondary hover:text-text-primary'
        "
        @click="toggleWireframe"
      >
        <Layers class="size-3.5" />
      </button>
      <button
        type="button"
        title="重置视角"
        class="size-7 rounded hover:bg-hairline/60 inline-flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
        @click="reset"
      >
        <RotateCcw class="size-3.5" />
      </button>
    </div>

    <div
      v-if="state.status === 'ready'"
      class="absolute bottom-2 left-2 flex items-center gap-3 bg-bg-elevated/80 backdrop-blur-sm border border-hairline rounded-md px-2.5 py-1.5 text-[11px] font-mono z-10"
    >
      <span class="inline-flex items-center gap-1 text-text-secondary">
        <BoxIcon class="size-3 text-coolant" />
        网格
        <span class="text-text-primary">{{ state.meshes.toLocaleString() }}</span>
      </span>
      <span class="text-hairline">|</span>
      <span class="inline-flex items-center gap-1 text-text-secondary">
        顶点
        <span class="text-text-primary">{{ state.vertices.toLocaleString() }}</span>
      </span>
      <span class="text-hairline">|</span>
      <span class="inline-flex items-center gap-1 text-text-secondary">
        <Maximize2 class="size-3 text-patina" />
        鼠标拖动 / 滚轮缩放
      </span>
    </div>

    <div
      v-if="state.status === 'loading'"
      class="absolute inset-0 bg-bg-base/85 backdrop-blur-sm flex items-center justify-center z-20"
    >
      <div class="text-center">
        <Loader2 class="size-8 text-molybdenum animate-spin mx-auto mb-3" />
        <div class="text-[12px] text-text-secondary mb-1">正在加载三维图纸…</div>
        <div v-if="state.progress > 0" class="text-[11px] font-mono text-text-muted">
          进度 {{ state.progress }}%
        </div>
      </div>
    </div>

    <div
      v-if="state.status === 'error'"
      class="absolute inset-0 bg-bg-base/90 flex items-center justify-center z-20 p-4"
    >
      <div class="max-w-md text-center">
        <AlertTriangle class="size-10 text-iron mx-auto mb-3" />
        <div class="text-[13px] text-iron font-medium mb-2">三维模型加载失败</div>
        <div class="text-[11px] text-text-secondary mb-2 break-words">{{ state.msg }}</div>
        <div v-if="fallbackHint" class="text-[11px] text-text-muted">{{ fallbackHint }}</div>
      </div>
    </div>
  </div>
</template>
