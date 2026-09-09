import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const applicationDirectory = fileURLToPath(new URL("./app", import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "~": applicationDirectory,
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "screens",
          environment: "jsdom",
          include: ["app/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "data",
          environment: "node",
          include: ["app/**/*.test.ts"],
        },
      },
    ],
  },
});
