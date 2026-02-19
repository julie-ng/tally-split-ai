export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'teal',
      neutral: 'slate',
    },
    container: {
      base: 'w-full max-w-full mx-auto px-4 sm:px-6 lg:px-8',
    },
    breadcrumb: {
      slots: {
        separatorIcon: 'text-slate-300',
      },
      variants: {
        active: {
          true: {
            link: 'font-medium text-slate-500',
          },
          false: {
            link: 'font-medium text-slate-500',
          },
        },
      },
    },
    button: {
      compoundVariants: [
        {
          color: 'neutral',
          variant: 'solid',
          class: 'bg-slate-500 hover:bg-slate-700 active:bg-slate-700',
        },
        {
          color: 'neutral',
          variant: 'subtle',
          class: 'bg-slate-200 border-slate-300 hover:bg-slate-300 active:bg-slate-300',
        },
      ],
    },
    slideover: {
      variants: {
        side: {
          right: {
            content: 'max-w-xl',
          },
        },
      },
    },
  },
})
