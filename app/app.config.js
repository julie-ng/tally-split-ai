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
  },
})
