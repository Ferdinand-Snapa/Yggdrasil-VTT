<script setup lang="ts">
import { useTemplateStore, newDecleration } from '@/stores/templateStore';

const templateStore = useTemplateStore()

const temp1: string = templateStore.newTemplate("test Template 1").id
const temp2: string = templateStore.newTemplate("test Template 2").id
const temp3: string = templateStore.newTemplate("test Template 3").id

templateStore.selectTemplate(temp1)
templateStore.setDerive(temp2)
templateStore.setDerive(temp3)
templateStore.setDerive(temp3, temp2)

templateStore.addDecleration(newDecleration("template 1 Declare 1", "String"))
templateStore.addDecleration(newDecleration("template 1 Declare 2", "Bool"))

templateStore.selectTemplate(temp3)
templateStore.addDecleration(newDecleration("template 3 Declare 1", "Float"))

templateStore.selectTemplate(temp2)
templateStore.addDecleration(newDecleration("template 2 Declare 1", "Intager"))

console.log(templateStore.getAllTemplateDeclerations(temp1))

function createNewTemplate() {
  templateStore.newTemplate()
}
</script>

<template>
  <main>
    <div>hello welcome to Yggdrasil</div>
    <button v-on:click="createNewTemplate">Create new template</button>
    <div class="flex flex-col gap-4">
      <div class="flex-1 outline-1 rounded-xl p-2" v-for="template in templateStore.templates" v-bind:key="template.id">
        <div>{{template.name}}</div>
      </div>

    </div>
  </main>
</template>
