<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <header class="bg-red-500 flex flex-row">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/codeEdit">Code Editor</RouterLink>
  </header>

  <RouterView />
</template>
