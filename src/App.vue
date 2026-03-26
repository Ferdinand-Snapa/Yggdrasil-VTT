<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="bg-red-500 flex flex-row">
    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/codeEdit">Code Editor</RouterLink>
  </header>

  <RouterView />
</template>
