import handlebars from "handlebars";
import { promises as fs } from "fs";

export const compileTemplate = async (templateFile: string, vars: any) => {
  const templateString = await fs.readFile(templateFile);
  const compiled = handlebars.compile(templateString.toString());
  return compiled(vars);
};
