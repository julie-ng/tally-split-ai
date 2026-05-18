import { defineContentConfig, defineCollection } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
  collections: {
    homepage: defineCollection({
      type: 'page',
      source: 'index.md',
      schema: z.object({
        title: z.string(),
        tagline: z.string().optional(),
        subtagline: z.string().optional(),
        description: z.string().optional(),
      })
    }),
    pipeline: defineCollection({
      type: 'page',
      source: 'homepage/pipeline.md',
      schema: z.object({
        workflow: z.array(z.object({
          title: z.string().optional(),
          icon: z.string().optional(),
          description: z.string().optional(),
          preview: z.string().optional(),
          image: z.object({
            src: z.string(),
            alt: z.string(),
          }).optional()
        })).optional()
      })
    }),
    architecture: defineCollection({
      type: 'page',
      source: 'homepage/cloud-architecture.md',
      schema: z.object({
        heading: z.string().optional(),
        subheading: z.string().optional(),
        description: z.string().optional(),
        components: z.array(z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          icon: z.string().optional()
        })).optional()
      })
    }),
    security: defineCollection({
      type: 'page',
      source: 'homepage/security/*.md',
      schema: z.object({
        heading: z.string().optional(),
        subheading: z.string().optional(),
        description: z.string().optional(),
      })
    }),
    tokenDesign: defineCollection({
      type: 'page',
      source: 'homepage/token-design.md',
      schema: z.object({
        title: z.string(),
        intro: z.string(),
        outtro: z.string(),
        components: z.array(z.object({
          example: z.string(),
          caption: z.string()
        }))
      })
    }),
  },
})
