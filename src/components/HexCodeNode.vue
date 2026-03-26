<script setup lang="ts">
import type { Hex, Point } from 'honeycomb-grid'
import type { Node, PortDefenition } from '@/stores/codeGraph'
import { onMounted } from 'vue'
import { SVG } from '@svgdotjs/svg.js'
import { defineHex, Grid, rectangle } from 'honeycomb-grid'

const props = defineProps<{
  node: Node
  hexSize: number
  inputPorts: PortDefenition[]
  outputPorts: PortDefenition[]
}>()

interface HexCorner {
  point1: Point
  point2: Point
}

const gridWidth: number = 1
const gridHeight: number = 1

onMounted(() => {
  const nodeBody = document.getElementById(`${props.node.id}`)!
  const HexDef = defineHex({ dimensions: props.hexSize, origin: 'topLeft' })
  const grid = new Grid(HexDef, rectangle({ width: gridWidth, height: gridHeight }))
  const draw = SVG().addTo(nodeBody).size('100%', '100%').addClass(`absolute inset-0 z--1`)
  const drawCorners: Map<number, HexCorner> = new Map<number, HexCorner>()

  grid.forEach(getCorner)
  console.log(drawCorners)

  const cornerCords: string[] = []
  for (let i: number = 0; i < 4; i++) {
    const corner: HexCorner = drawCorners.get(i)!
    cornerCords.push(`${corner.point1.x}, ${corner.point1.y}`)
    cornerCords.push(`${corner.point2.x}, ${corner.point2.y}`)
  }

  draw.polygon(cornerCords.join(', ')).fill('gray')

  function getCorner(hex: Hex) {
    //Top Left
    if (hex.row == 0 && hex.col == 0)
      drawCorners.set(0, { point1: hex.corners[4]!, point2: hex.corners[5]! })
    //Top Right
    if (hex.row == 0 && hex.col == gridWidth - 1)
      drawCorners.set(1, { point1: hex.corners[5]!, point2: hex.corners[0]! })
    //Bottom Right
    if (hex.row == gridHeight - 1 && hex.col == gridWidth - 1)
      drawCorners.set(2, { point1: hex.corners[1]!, point2: hex.corners[2]! })
    //Bottom Left
    if (hex.row == gridHeight - 1 && hex.col == 0)
      drawCorners.set(3, { point1: hex.corners[2]!, point2: hex.corners[3]! })
  }
})
</script>

<template>
  <!--Hexagon side = a = hexSize | width = s = a * 1.732 | height = d = a * 2-->
  <div
    :id="`${node.id}`"
    class="absolute shadow cursor-pointer flex-row items-center justify-center pt-6 pb-18"
    :style="`width: ${hexSize * gridWidth * 1.732}px; height: ${hexSize * gridHeight * 2}px`"
  >
    <div class="z-10 relative text-center">{{ node.type.toUpperCase() }}</div>
    <div class="z-10 relative h-full flex flex-row">
      <!--Input-->
      <div class="flex-1 flex flex-col">
        <div class="flex-row flex gap-2" v-for="input in inputPorts" v-bind:key="input.id">
          <div class="w-3 h-3 rounded-full bg-white border cursor-pointer self-center"></div>
          <div>{{ input.name }}</div>
        </div>
      </div>

      <!--Output-->
      <div class="flex-1 flex flex-col items-end">
        <div class="flex-row flex gap-2" v-for="output in outputPorts" v-bind:key="output.id">
          <div>{{ output.name }}</div>
          <div class="w-3 h-3 rounded-full bg-black border cursor-pointer self-center"></div>
        </div>
      </div>
    </div>
  </div>
</template>
