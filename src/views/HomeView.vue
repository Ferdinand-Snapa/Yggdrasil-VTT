<script setup lang="ts">
import TheWelcome from '../components/TheWelcome.vue'
import { useGraphStore } from '@/stores/codeGraph';

const graphStore = useGraphStore("testGraphHome")

graphStore.addNode({
  id: "start node of test graph",
  type: "start",
  position: {x:0,y:0},
})

graphStore.addNode({
  id:"print Node",
  type: "log",
  position: {x:0,y:0}
})

graphStore.addNode({
  id:"multiply Node",
  type: "mult",
  position: {x:0,y:0}
})

graphStore.addNode({
  id:"addition Node",
  type: "add",
  position: {x:0,y:0}
})

graphStore.addNode({
  id:"const Node 1",
  type: "constNumber",
  position: {x:0,y:0},
  state: {
    value: 5
  }
})

graphStore.addNode({
  id:"const Node 2",
  type: "constNumber",
  position: {x:0,y:0},
  state: {
    value: 7
  }
})

graphStore.setEntryNode("start node of test graph")

graphStore.connect({
  fromNode: "start node of test graph",
  fromPort: "next",
  toNode: "print Node",
  toPort: "fire"
})

graphStore.connect({
  fromNode: "multiply Node",
  fromPort: "result",
  toNode: "print Node",
  toPort: "value"
})

graphStore.connect({
  fromNode: "addition Node",
  fromPort: "result",
  toNode: "multiply Node",
  toPort: "a"
})

graphStore.connect({
  fromNode: "const Node 1",
  fromPort: "const",
  toNode: "addition Node",
  toPort: "a"
})

graphStore.connect({
  fromNode: "const Node 2",
  fromPort: "const",
  toNode: "addition Node",
  toPort: "b"
})

graphStore.connect({
  fromNode: "const Node 2",
  fromPort: "const",
  toNode: "multiply Node",
  toPort: "b"
})

graphStore.runCurrentGraph()
</script>

<template>
  <main>
    <TheWelcome />
  </main>
</template>
