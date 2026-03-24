<script setup lang="ts">
import type { Hex, Point } from 'honeycomb-grid'
import type { Node } from '@/stores/codeGraph';
import { onMounted } from 'vue';
import { SVG } from '@svgdotjs/svg.js'
import { defineHex, Grid, rectangle } from 'honeycomb-grid'

const props = defineProps<{
node: Node,
hexSize: number
}>()

interface HexCorner {
    point1: Point
    point2: Point 
}

const gridWidth: number = 2
const gridHeight: number = 1

onMounted(() => {
    const HexDef = defineHex({ dimensions: props.hexSize, origin:'topLeft'})
    const grid = new Grid(HexDef, rectangle({ width: gridWidth, height: gridHeight}))
    const draw = SVG().addTo(`#NodeBody`).size('100%', '100%')
    const drawCorners: Map<number, HexCorner> = new Map<number, HexCorner>()

    grid.forEach(getCorner)
    console.log(drawCorners)

    const cornerCords: string[] = []
    for (let i: number = 0; i < 4; i++) {
        const corner: HexCorner = drawCorners.get(i)!
        cornerCords.push(`${corner.point1.x}, ${corner.point1.y}`)
        cornerCords.push(`${corner.point2.x}, ${corner.point2.y}`)
    }
    
    draw.polygon(cornerCords.join(', ')).fill('blue').stroke('red')

    function getCorner(hex : Hex) {
        const points: string[] = hex.corners.map(({ x, y }) => `${x}, ${y}`)
        //Top Left
        if (hex.row == 0 && hex.col == 0) 
            drawCorners.set(0, {point1: hex.corners[4]!, point2: hex.corners[5]!})
        //Top Right
        if (hex.row == 0 && hex.col == (gridWidth - 1))
            drawCorners.set(1, {point1: hex.corners[5]!, point2: hex.corners[0]!})
        //Bottom Right
        if (hex.row == (gridHeight - 1) && hex.col == (gridWidth - 1))
            drawCorners.set(2, {point1: hex.corners[1]!, point2: hex.corners[2]!})
        //Bottom Left
        if (hex.row == (gridHeight - 1) && hex.col == 0)
            drawCorners.set(3, {point1: hex.corners[2]!, point2: hex.corners[3]!})
    }
})



</script>

<template>
    <div :id="`NodeBody`" class="absolute shadow cursor-pointer flex items-center justify-center">
        <div class="absolute inset-0">Hello</div>
    </div>
    
</template>