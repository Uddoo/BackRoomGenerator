import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import ts from "typescript";

const outDir = resolve(".test-build");
const testFile = resolve(outDir, "test/generator-rules.test.js");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, "package.json"), JSON.stringify({ type: "commonjs" }));

await transpileTree(resolve("src"));
await transpileTree(resolve("test"));

const result = spawnSync(process.execPath, ["--test", testFile], {
  stdio: "inherit"
});

await rm(outDir, { recursive: true, force: true });
process.exitCode = result.status ?? 1;

async function transpileTree(root) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = join(root, entry.name);
    if (entry.isDirectory()) {
      await transpileTree(sourcePath);
      continue;
    }

    if (extname(entry.name) !== ".ts") {
      continue;
    }

    const source = await readFile(sourcePath, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        sourceMap: true
      },
      fileName: sourcePath
    });
    const relativePath = relative(resolve("."), sourcePath).replace(/\.ts$/, ".js");
    const outputPath = resolve(outDir, relativePath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${output.outputText}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(output.sourceMapText ?? "").toString("base64")}`);
  }
}
