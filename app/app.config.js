export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'teal',
      neutral: 'slate',
      warning: 'amber',
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
