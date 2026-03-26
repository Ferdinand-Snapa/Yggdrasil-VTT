<script setup lang="ts">
import { useGraphStore } from '@/stores/codeGraph'
import { SVG } from '@svgdotjs/svg.js'
import { defineHex, Grid, rectangle } from 'honeycomb-grid'
import type { Hex, Point } from 'honeycomb-grid'
import { onMounted, ref, computed, reactive } from 'vue'
import HexNode from '@/components/HexCodeNode.vue'
import { NodeRegestry } from '@/nodes/nodeRegestry'

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

const graphStore = useGraphStore('TestGraph')

graphStore.addNode({
  id: 'start node of test graph',
  type: 'start',
  position: { x: 0, y: 0 },
})

graphStore.addNode({
  id: 'print test',
  type: 'log',
  position: { x: 100, y: 100 },
})

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

    graphStore.setNodePosition(draggingNodeId, {
      x: nodePos.x - (nodePos.x % (hexSize / 2)),
      y: nodePos.y - (nodePos.y % (hexSize / 2)),
    })
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
          :style="{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }"
          @pointerdown.stop="onNodeDragStart($event, node.id)"
        />
      </div>

      <div
        class="absolute inset-0 h-screen w-screen transition-[mask-position] duration-75 grad-color z-5"
        :style="maskStyle"
        id="background"
      ></div>
    </div>
  </div>
</template>
