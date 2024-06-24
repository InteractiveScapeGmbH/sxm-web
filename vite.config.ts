import dts from "vite-plugin-dts";
import path from "path";
import { defineConfig, UserConfig } from "vite";

export default defineConfig({
    base: "./",
    plugins: [dts({ rollupTypes: true })],
    build: {
        sourcemap: true,
        lib: {
            entry: path.resolve(__dirname, "src/sxm-web.ts"),
            name: "SxmWeb",
            formats: ["es", "cjs", "umd", "iife"],
            fileName: (format) => `sxm-web.${format}.js`,
        },
    },
} satisfies UserConfig);