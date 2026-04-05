import { defineStore } from "pinia";

type TemplateId = string
type DeclarationId = string

type variableType = "Intager" | "String" | "Float" | "Bool"

interface Declaration {
  id: DeclarationId
  name: string
  type: variableType
  array: boolean
  icon?: string
  color?: string
}

interface Template {
  id: TemplateId,
  name: string,
  derives: TemplateId[]
  declarations: Declaration[]
}

export function newTemplate(templateName: string): Template {
  return { id: templateName, name: templateName, derives: [], declarations: []}
}

export function newDecleration(declerationName: string, variableType: variableType) {
  return { id: declerationName, name: declerationName, type: variableType, array: false }
}

//Used for creating templates, not characters
export const useTemplateStore = defineStore("TemplateStore", {
  state: () => ({
    templates: [] as Template[],
    selectedTemplate: null as TemplateId | null
  }),
  actions: {
    //Create a new template
    newTemplate(templateName?: string) {
      const name = templateName ?? `UnNamed Template`
      const template = newTemplate(name)
      this.templates.push(template)
      return template
    },

    selectTemplate(templateId: TemplateId) {
      this.selectedTemplate = templateId
      return this.getTemplateById()
    },

    setDerive(derives: TemplateId, templateId?: TemplateId) {
      const id: TemplateId | null = templateId ?? this.selectedTemplate
      if (id == null) return
      this.getTemplateById(id)?.derives.push(derives)
    },

    removeDerive(rm: TemplateId, templateId?: TemplateId) {
      const id: TemplateId | null = templateId ?? this.selectedTemplate
      if (id == null) return
      this.getTemplateById(id)?.derives.filter((tempId) => tempId !== rm)
    },

    addDecleration(declaration : Declaration, templateId?: TemplateId) {
      const id: TemplateId | null = templateId ?? this.selectedTemplate
      if (id == null) return
      this.getTemplateById(id)?.declarations.push(declaration)
    }
  },
  getters: {
    //if templateId not defiend, return selected
    getTemplateById: (state) => {
      return (templateId?: TemplateId): Template | null => {
      const id: TemplateId | null = templateId ?? state.selectedTemplate
      if (id == null) return null
      return state.templates.find((temp) => temp.id == id) ?? null
      }
    },
    getDerivedTemplateId: (state) => {
      return (templateId?: TemplateId): TemplateId[] | null => {
        const id: TemplateId | null = templateId ?? state.selectedTemplate
        if (id == null) return null

        const visit = new Set<TemplateId>()

        const recursive = (id: TemplateId) => {
          if (visit.has(id)) return

          visit.add(id)
          const template = state.templates.find((temp) => temp.id === id)
          if (!template) return

          for (const derive of template.derives) {
            recursive(derive)
          }
        }
        recursive(id)
        visit.delete(id)

        return Array.from(visit)
      }
    },

    getAllTemplateDeclerations: (state) => {
      return (templateId?: TemplateId): Record<string, Declaration[]> => {
        const id: TemplateId | null = templateId ?? state.selectedTemplate
        if (id === null) return {}

        const deriveIds = useTemplateStore().getDerivedTemplateId(id)
        const allId = [id, ...deriveIds ?? []]
        const result: Record<TemplateId, Declaration[]> = {}

        for (const tempId of allId) {
          const template = state.templates.find((temp) => temp.id == tempId)
          if (!template) continue
          result[tempId] = template.declarations ?? []
        }

        return result
      }
    },
  }
})
