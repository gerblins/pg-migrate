import { migrate, Migration, dbSettings, appSettings } from ".";
import pg from "pg";
import { compileFolder } from "./typescript_utils";
import { ArgumentParser } from "argparse";

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

const args = parser.parseArgs();

const main = async () => {
  const settings = await appSettings(undefined, args);
  console.info(`Collecting migrations...`);
  const compiledFolder = await compileFolder(settings.migrationsFolder);
  const migrations: Migration[] = compiledFolder
    .map((m) => m.default)
    .sort((a: Migration, b: Migration) => a.serial - b.serial);

  const client = new pg.Client(await dbSettings());
  console.info(`Running migrations...`);
  await client.connect();
  try {
    await migrate(client, migrations, "public", "__migrations");
    console.info(`Migrations complete`);
  } catch (err) {
    console.error(`An error occurred while running migrations`);
    console.error(err);
  }
  await client.end();
};

main();
