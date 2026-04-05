<script setup lang="ts">
import { NodeRegestry } from '@/nodes/nodeRegestry'
import { NodeCategories } from '@/stores/codeGraph'
import type { NodeDefenition } from '@/stores/codeGraph'
import { ContextMenu } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'

import { onMounted, ref } from 'vue'

const props = defineProps<{
  newNode?: (type: string) => void
}>()

const menu = ref()

//open menu
function show(e: PointerEvent) {
  console.log('open menu')
  menu.value.show(e)
  compileItem()
}

function compileItem() {
  items.value = []
  for (const category in NodeCategories) {
    items.value.push({
      label: NodeCategories[category],
      items: categorizedNodes(NodeCategories[category]!).map(([name, def]) => {
        console.log('hello')
        console.log(`${NodeCategories[category]}: ${name}`)
        const outputItem: MenuItem[] = def.outputs.map((port) => ({
          label: `${port.name}: ${port.kind}`,
        }))
        const inputItem: MenuItem[] = def.inputs.map((port) => ({
          label: `${port.name}: ${port.kind}`,
        }))
        const portItem: MenuItem[] = [
          { label: 'Output', disabled: true },
          ...outputItem,
          { label: 'Input', disabled: true },
          ...inputItem,
        ]
        return {
          label: name,
          items: portItem,
          command: () => {
            props.newNode!(name)
          },
        }
      }),
    })
  }
  console.log(items.value)
}

const items = ref<MenuItem[]>([{ label: `Add Node`, disabled: true }, { separator: true }])

const categorizedNodes = (category: string): [string, NodeDefenition][] => {
  console.log(`${category}`)
  const registry = Object.entries(NodeRegestry)
  return registry.filter((def) => def[1].category === category)
}

onMounted(() => {
  compileItem()
  console.log(items.value)
})

defineExpose({
  show,
})
</script>
<template>
  <ContextMenu ref="menu" :model="items" />
</template>
