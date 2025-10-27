// @ts-nocheck

/** @type {import("eslint").Linter.Config} */
module.exports = {
  plugins: ["sql"],
  overrides: [
    {
      files: ["**/*.sql"],
      processor: "sql/sql"
    }
  ],
  ignorePatterns: [
    "supabase/",
    "supabase/functions/**",
    "node_modules/",
    "dist/"
  ]
};