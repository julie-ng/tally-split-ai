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
