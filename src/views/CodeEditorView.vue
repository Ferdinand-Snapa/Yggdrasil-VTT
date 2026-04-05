<script setup lang="ts">
import { useGraphStore } from '@/stores/codeGraph'
import { SVG } from '@svgdotjs/svg.js'
import { defineHex, Grid, rectangle } from 'honeycomb-grid'
import type { Hex, Point } from 'honeycomb-grid'
import { onMounted, ref, computed, reactive } from 'vue'
import HexNode from '@/components/HexCodeNode.vue'
import { NodeRegestry } from '@/nodes/nodeRegestry'
import CodeEditContextMenu from '@/components/CodeEditContextMenu.vue'

const hexSize: number = 100

onMounted(() => {
  const HexDef = defineHex({ dimensions: hexSize, origin: 'topLeft' })
  const grid = new Grid(HexDef, rectangle({ width: 35, height: 35 }))
  //const draw = SVG().addTo('#background').size('100%', '100%').addClass("w-screen h-screen grad-color")
  const draw = SVG().addTo('#background').size('100%', '100%')
  const drawDots = SVG().addTo('#maskingLayer').size('100%', '100%')

  grid.forEach(renderSVG)
  grid.forEach(renderDots)

  function renderDots(hex: Hex) {
    const corners: Point[] = hex.corners
    corners.forEach(({ x, y }) => {
      drawDots.circle(5).attr({
        cx: x,
        cy: y,
        fill: '#ffffff',
      })
    })
  }

  function renderSVG(hex: Hex) {
    const points: string[] = hex.corners.map(({ x, y }) => `${x},${y}`)
    const polygon = draw
      // create a polygon from a hex's corner points
      .polygon(points.join(', '))
      .fill('none')
    return draw.group().add(polygon)
  }
})

function pixelToHex(x: number, y: number, size: number) {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size
  const r = ((2 / 3) * y) / size
  return { q, r }
}

function axialToCube(q: number, r: number) {
  return { x: q, z: r, y: -q - r }
}

function cubeRound(x: number, y: number, z: number) {
  let rx = Math.round(x)
  let ry = Math.round(y)
  let rz = Math.round(z)

  const xDiff = Math.abs(rx - x)
  const yDiff = Math.abs(ry - y)
  const zDiff = Math.abs(rz - z)

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz
  } else if (yDiff > zDiff) {
    ry = -rx - rz
  } else {
    rz = -rx - ry
  }

  return { x: rx, y: ry, z: rz }
}

function cubeToAxial(x: number, y: number, z: number) {
  return { q: x, r: z }
}

function hexToPixel(q: number, r: number, size: number) {
  const x = size * Math.sqrt(3) * (q + r / 2)
  const y = ((size * 3) / 2) * r
  return { x, y }
}

function getClosestHexCenter(x: number, y: number, size: number) {
  // 1. pixel → axial
  const fractional = pixelToHex(x, y, size)

  // 2. axial → cube
  const cube = axialToCube(fractional.q, fractional.r)

  // 3. round cube
  const rounded = cubeRound(cube.x, cube.y, cube.z)

  // 4. cube → axial
  const axial = cubeToAxial(rounded.x, rounded.y, rounded.z)

  // 5. axial → pixel
  return hexToPixel(axial.q, axial.r, size)
}

const graphStore = useGraphStore('TestGraph')

graphStore.addNode({
  id: 'start node of test graph',
  type: 'start',
  position: { x: 0, y: 0 },
})

graphStore.addNode({
  id: 'print test',
  type: 'log',
  position: { x: 173 * 2, y: 0 },
})

graphStore.addNode({
  id: 'const Node 1',
  type: 'constNumber',
  position: { x: 0, y: 300 },
  state: {
    value: 5,
  },
})

graphStore.connect({
  fromNode: 'start node of test graph',
  fromPort: 'next',
  toNode: 'print test',
  toPort: 'fire',
})

graphStore.connect({
  fromNode: 'const Node 1',
  fromPort: 'const',
  toNode: 'print test',
  toPort: 'value',
})

graphStore.setEntryNode('start node of test graph')

graphStore.runCurrentGraph()

const scale = ref(1)
const offset = reactive({ x: 0, y: 0 })

const isPanning = ref(false)
const panStart = reactive({ x: 0, y: 0 })

//Draging Node

let draggingNodeId: string | null = null
const dragOffset = { x: 0, y: 0 }

function onNodeDragStart(e: PointerEvent, nodeId: string) {
  console.log('startign to drag node: ' + nodeId)
  draggingNodeId = nodeId

  const rect = (e.target as HTMLElement).getBoundingClientRect()

  dragOffset.x = (e.clientX - rect.left) / scale.value
  dragOffset.y = (e.clientY - rect.top) / scale.value

  window.addEventListener('pointermove', onNodeDragMove)
  window.addEventListener('pointerup', onNodeDragEnd)
}

const mouseWorldPosX = ref(0)
const mouseWorldPosY = ref(0)

function onNodeDragMove(e: PointerEvent) {
  if (!draggingNodeId) return

  graphStore.setNodePosition(draggingNodeId, {
    x: (e.clientX - offset.x) / scale.value - dragOffset.x,
    y: (e.clientY - offset.y) / scale.value - dragOffset.y,
  })
}

function onNodeDragEnd() {
  if (draggingNodeId) {
    const nodePos: { x: number; y: number } = graphStore.getNode(draggingNodeId)?.position as {
      x: number
      y: number
    }

    const snapPosition: { x: number; y: number } = getClosestHexCenter(
      nodePos.x,
      nodePos.y,
      hexSize,
    )
    graphStore.setNodePosition(draggingNodeId, snapPosition)
  }
  draggingNodeId = null
  window.removeEventListener('pointermove', onNodeDragMove)
  window.removeEventListener('pointerup', onNodeDragEnd)
}

// Panning

function onPanStart(e: PointerEvent) {
  isPanning.value = true
  panStart.x = e.clientX - offset.x
  panStart.y = e.clientY - offset.y
}

function onPanMove(e: PointerEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  mouseWorldPosX.value = (mouseX - offset.x) / scale.value
  mouseWorldPosY.value = (mouseY - offset.y) / scale.value
  if (!isPanning.value) return

  offset.x = e.clientX - panStart.x
  offset.y = e.clientY - panStart.y
}

function onPanEnd() {
  isPanning.value = false
}

//Zoom
function onWheel(e: WheelEvent) {
  const zoomIntensity = 0.001
  const delta = -e.deltaY * zoomIntensity

  const newScale = Math.min(Math.max(0.2, scale.value + delta), 3)

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  const worldX = (mouseX - offset.x) / scale.value
  const worldY = (mouseY - offset.y) / scale.value

  scale.value = newScale

  offset.x = mouseX - worldX * scale.value
  offset.y = mouseY - worldY * scale.value
}

const canvasStyle = computed(() => ({
  transform: `
    translate(${offset.x}px, ${offset.y}px)
    scale(${scale.value})
  `,
}))

const maskStyle = computed(() => ({
  maskImage: `radial-graadient(
    circkle 240px at ${mouseWorldPosX.value}px ${mouseWorldPosY.value}px,
    black 0%,
    transparent 100%
  )`,
  WebkitMaskImage: `radial-gradient(
    circle 240px at ${mouseWorldPosX.value}px ${mouseWorldPosY.value}px,
    black 0%,
    transparent 100%
  )`,
}))

const portPositions = ref({} as Record<string, { x: number; y: number }>)
//const portPositions = new Map<string, { x: number; y: number }>()

function registerPort(element: HTMLElement, nodeId: string, portId: string) {
  const rect = element.getBoundingClientRect()
  const viewportRect = document.getElementById('viewport')!.getBoundingClientRect()
  portPositions.value[`${nodeId}:${portId}`] = {
    x: rect.left + rect.width / 2 - viewportRect.left,
    y: rect.top + rect.height / 2 - viewportRect.top,
  }
}

function getBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1)

  const offset = Math.max(50, dx * 0.5)

  const cx1 = x1 + offset
  const cy1 = y1

  const cx2 = x2 - offset
  const cy2 = y2

  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
}

function getPortX(
  nodeId: string,
  portId: string,
  record: Record<string, { x: number; y: number }>,
): number {
  return record[`${nodeId}:${portId}`]?.x ?? 0
}

function getPortY(
  nodeId: string,
  portId: string,
  record: Record<string, { x: number; y: number }>,
): number {
  return record[`${nodeId}:${portId}`]?.y ?? 0
}

const contextOpenPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 })

const contextMenu = ref()

function openContextMenu(e: PointerEvent) {
  const mousePos = { x: e.clientX as number, y: e.clientY as number }
  contextOpenPosition.value = mousePos
  contextMenu.value.show(e)
}
</script>

<style lang="css">
.grad-color {
  animation: anim-gradient 4s ease-in infinite;
  stroke-width: 2px;
  stroke-opacity: 100%;
}

@keyframes anim-gradient {
  0%,
  100% {
    stroke: rgba(255, 0, 0, 255);
  }
  33% {
    stroke: rgba(0, 255, 0, 255);
  }
  66% {
    stroke: rgba(0, 0, 255, 255);
  }
}
</style>

<template>
  <div>Code editor</div>
  <div
    ref="viewport"
    id="viewport"
    class="outline-amber-300 w-full h-screen outline-2 relative overflow-hidden cursor-grab"
    @pointerdown="onPanStart"
    @pointermove="onPanMove"
    @pointerup="onPanEnd"
    @pointerleave="onPanEnd"
    @wheel.prevent="onWheel"
  >
    <!--Canvas-->
    <div
      class="absolute top-0 left-0 origin-top-left h-screen w-screen"
      :style="canvasStyle"
      id="maskingLayer"
    >
      <!--Nodes-->
      <div
        v-for="node in graphStore.graph.nodes"
        :key="node.id"
        class="z-10 inset-0 absolute pointer-events-none select-none"
      >
        <HexNode
          :key="node.id"
          :node="node"
          :hex-size="hexSize"
          :input-ports="NodeRegestry[node.type]?.inputs!"
          :output-ports="NodeRegestry[node.type]?.outputs!"
          :register-node-position="registerPort"
          :style="{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }"
          @pointerdown.stop="onNodeDragStart($event, node.id)"
        />
      </div>
      <!--Connections-->
      <svg class="z-15 absolute inset-0 pointer-events-none w-screen h-screen">
        <path
          v-for="(connection, index) in graphStore.graph.connections"
          :key="index"
          :d="
            getBezierPath(
              getPortX(connection.fromNode, connection.fromPort, portPositions),
              getPortY(connection.fromNode, connection.fromPort, portPositions),
              getPortX(connection.toNode, connection.toPort, portPositions),
              getPortY(connection.toNode, connection.toPort, portPositions),
            )
          "
          fill="none"
          stroke="green"
          stroke-width="4"
        ></path>
      </svg>
      <CodeEditContextMenu
        ref="contextMenu"
        test="testString props"
        :new-node="
          (type: string) => {
            const closestHex: { x: number; y: number } = getClosestHexCenter(
              contextOpenPosition.x,
              contextOpenPosition.y,
              hexSize,
            )
            graphStore.addNodeType(type, closestHex)
          }
        "
      />

      <div
        class="absolute inset-0 h-screen w-screen transition-[mask-position] duration-75 grad-color z-5'"
        :style="maskStyle"
        @contextmenu="openContextMenu"
        id="background"
      ></div>
    </div>
  </div>
</template>
