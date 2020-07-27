import {
  migrate,
  Migration,
  dbSettings,
  appSettings,
  compileTemplate,
} from ".";
import pg from "pg";
import { compileFolder } from "./typescript_utils";
import { ArgumentParser } from "argparse";
import { promises as fs } from "fs";
import path from "path";

const parser = new ArgumentParser({
  version: "0.0.1",
  addHelp: true,
  description: "Standalone migration runner for @gerblins/pg-migration",
});

parser.addArgument(["-db", "--database"], {
  help: "Name of the database to use",
});

parser.addArgument(["--host"], {
  help: "Host to connect to",
});

parser.addArgument(["-p", "--port"], {
  help: "Port to connect to",
});

parser.addArgument(["-u", "--user"], {
  help: "Username to use when connecting",
});

parser.addArgument(["-pw", "--password"], {
  help: "Password to use when connecting",
});

parser.addArgument(["-s", "--schema"], {
  help: "Schema for migrations table",
});

parser.addArgument(["-t", "--table"], {
  help: "Table to keep track of migrations",
});

parser.addArgument(["-cs", "--connection-string"], {
  help: "Postgres connection string",
});

parser.addArgument(["-m", "--migrations"], {
  help: "Folder that contains the migrations",
});

parser.addArgument(["-tpl", "--template"], {
  help: "Template to use for creating migrations",
});

parser.addArgument("command", { choices: ["migrate", "create"] });

const args = parser.parseArgs();

const runMigrate = async () => {
  const settings = await appSettings(undefined, args);
  console.info(`Collecting migrations...`);
  const compiledFolder = await compileFolder(settings.migrationsFolder);
  const migrations: Migration[] = compiledFolder
    .map((m) => m.default)
    .sort((a: Migration, b: Migration) => a.serial - b.serial);

  const db = await dbSettings(undefined, args);
  const client = new pg.Client(db);
  console.info(`Running migrations...`);
  await client.connect();
  try {
    await migrate(
      client,
      migrations,
      db.migrationSchema || "public",
      db.migrationTable || "__migrations",
    );
    console.info(`Migrations complete.`);
  } catch (err) {
    console.error(
      `An error occurred while running migrations. All changes have been reverted.`,
    );
    console.error(err);
  }
  await client.end();
};

const createMigration = async () => {
  const settings = await appSettings(undefined, args);
  const now = new Date();
  const serial = `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDay()}${now.getUTCHours()}${now.getUTCMinutes()}${now.getUTCSeconds()}`;
  const compiledTemplate = await compileTemplate(settings.migrationTemplate, {
    serial,
  });
  const outfile = path.join(
    settings.migrationsFolder,
    `${serial}.migration.ts`,
  );
  try {
    await fs.access(settings.migrationsFolder);
  } catch {
    console.log("Creating migrations folder...");
    await fs.mkdir(settings.migrationsFolder);
  }
  await fs.writeFile(outfile, compiledTemplate);
  console.info(`Migration created: ${outfile}`);
};

switch (args.command) {
  case "migrate":
    runMigrate();
    break;
  case "create":
    createMigration();
    break;
  default:
    break;
}
