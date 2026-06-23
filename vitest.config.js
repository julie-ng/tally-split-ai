import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    // Keep vitest's built-in excludes (node_modules, dist, .git, etc.) and also
    // skip agent worktrees under .claude/worktrees, which are separate checkouts
    // whose stale test files would otherwise be globbed into this run.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
