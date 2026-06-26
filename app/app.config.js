export default defineAppConfig({
  ui: {
    colors: {
      brand: 'brand',
      primary: 'brand',
      secondary: 'teal',
      neutral: 'mist',
      info: 'cyan',
      warning: 'amber',
      success: 'emerald',
      error: 'red',
    },
    container: {
      base: 'w-full max-w-full mx-auto px-4 sm:px-6 lg:px-8',
    },
    input: {
      slots: {
        base: 'bg-muted!',
      },
    },
    textarea: {
      slots: {
        base: 'bg-muted!',
      },
    },
    inputDate: {
      slots: {
        base: 'bg-muted!',
      },
    },
    inputTime: {
      slots: {
        base: 'bg-muted!',
      },
    },
    select: {
      slots: {
        base: 'bg-muted!',
      },
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
