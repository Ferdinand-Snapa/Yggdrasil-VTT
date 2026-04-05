import { createRouter, createWebHistory } from 'vue-router'
import CodeEditorView from "../views/CodeEditorView.vue"
import HomeView from "../views/HomeView.vue"



const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },

    {
      path: '/codeEdit',
      name: 'codeEdit',
      component: CodeEditorView
    }
  ],
})

export default router
