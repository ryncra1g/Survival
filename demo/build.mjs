import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import fs from "node:fs";
import path from "node:path";

// BUNDLE_REACT=1 inlines React (for offline checks); the published page loads React from cdnjs.
const inline = process.env.BUNDLE_REACT === "1";
const root = path.resolve(import.meta.dirname, "..");
const globals = { react: "React", "react-dom/client": "ReactDOM" };
const shim = {
  name: "globals",
  setup(b) {
    b.onResolve({ filter: inline ? /^next\/(navigation|link)$/ : /^(react|react-dom\/client|react\/jsx-runtime|next\/navigation|next\/link)$/ }, (a) => ({ path: a.path, namespace: "shim" }));
    b.onLoad({ filter: /.*/, namespace: "shim" }, (a) => {
      if (a.path === "react/jsx-runtime")
        return { contents: "const R=window.React;const j=(t,p,k)=>R.createElement(t,k===undefined?p:{...p,key:k});export const jsx=j,jsxs=j,Fragment=R.Fragment;", loader: "js" };
      if (a.path === "next/navigation") return { contents: "export const useRouter=()=>({push(){},refresh(){}});", loader: "js" };
      if (a.path === "next/link") return { contents: "import {createElement} from 'react';export default function Link({href,children,...p}){return createElement('span',p,children)}", loader: "js", resolveDir: root };
      return { contents: `module.exports=window.${globals[a.path]};`, loader: "js" };
    });
  },
};
const js = await build({
  entryPoints: [path.join(root, "demo/main.tsx")],
  bundle: true, minify: process.env.NO_MINIFY !== "1", format: "iife", write: false, platform: "browser", target: "es2020",
  jsx: "automatic", alias: { "@": root }, plugins: [shim], define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_BRAND_NAME": JSON.stringify(process.env.NEXT_PUBLIC_BRAND_NAME ?? "") },
});
const cssIn = fs.readFileSync(path.join(root, "demo/demo.css"), "utf8");
const css = await postcss([tailwind({ base: root, optimize: true })]).process(cssIn, { from: path.join(root, "demo/demo.css") });
const brand = (process.env.NEXT_PUBLIC_BRAND_NAME ?? "").trim() || "ReadyPlan";
const html = `<title>${brand} demo</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css.css}</style>
<div id="root"></div>
${inline ? "" : `<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>`}
<script>${js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script>
`;
fs.mkdirSync(path.join(root, "demo/dist"), { recursive: true });
const out = inline ? "demo/dist/demo-offline.html" : "demo/dist/demo.html";
fs.writeFileSync(path.join(root, out), html);
console.log(`${out} ${(html.length / 1024).toFixed(0)} KB`);
