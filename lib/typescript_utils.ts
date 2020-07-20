import ts, { CompilerOptions } from "typescript";
import { promises as fs } from "fs";
import path from "path";
import requireFromString from "require-from-string";

const DEFAULT_COMPILER_SETTINGS: CompilerOptions = {
  target: ts.ScriptTarget.ES2018,
  module: ts.ModuleKind.CommonJS,
};

export const listTsInFolder = async (folder: string) => {
  const files = await fs.readdir(folder);
  return files
    .filter((f) => f.endsWith(".ts"))
    .map((f) => path.join(folder, f));
};

export const compileFiles = (
  files: string[],
  compilerOptions: CompilerOptions = DEFAULT_COMPILER_SETTINGS,
) => {
  const createdFiles: Record<string, string> = {};
  const host = ts.createCompilerHost(compilerOptions);
  host.writeFile = (fileName: string, contents: string) =>
    (createdFiles[fileName] = contents);

  const program = ts.createProgram(files, compilerOptions, host);
  program.emit();

  return Object.entries(createdFiles).map(([fileName, body]) =>
    requireFromString(body, fileName),
  );
};

export const compileFolder = async (
  folder: string,
  compilerOptions: CompilerOptions = DEFAULT_COMPILER_SETTINGS,
) => {
  const filesToCompile = await listTsInFolder(folder);
  return compileFiles(filesToCompile, compilerOptions);
};
