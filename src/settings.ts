import pg from "pg";
import { promises as fs } from "fs";
import { compileFiles } from ".";

export interface DBSettings extends pg.ClientConfig {
  migrationSchema?: string;
  migrationTable?: string;
}

export interface AppSettings {
  migrationsFolder: string;
}

export const DEFAULT_SETTINGS_NAME = ".gpgm.ts";
export const DEFAULT_MIGRATIONS_FOLDER = "migrations";

export const mapObject = (
  obj: { [key: string]: any },
  mapping: {
    [env: string]:
      | string
      | {
          name: string;
          defaultValue?: string;
          convert: <T>(value: string) => T;
        }
      | [string, string | undefined, (value: string) => any];
  },
) => {
  return Object.entries(mapping).reduce<{ [key: string]: string | undefined }>(
    (prev, [key, map]) => {
      if (Array.isArray(map)) {
        const [name, defaultValue, convert] = map;
        let value = obj[key] || defaultValue;
        if (value !== undefined) {
          value = convert(value);
        }
        return { ...prev, [name]: value };
      } else if (typeof map === "object") {
        let value = obj[key] || map.defaultValue;
        if (value !== undefined) {
          value = map.convert(value);
        }
        return { ...prev, [map.name]: value };
      }
      return { ...prev, [map]: obj[key] };
    },
    {},
  );
};

function stripUndefined<T>(obj: any): T {
  const newObj = { ...obj };
  Object.entries(obj).forEach(([key, val]) => {
    if (val === undefined) {
      delete newObj[key];
    }
  });
  return newObj;
}

function stripNull<T>(obj: any): T {
  const newObj = { ...obj };
  Object.entries(obj).forEach(([key, val]) => {
    if (val === null) {
      delete newObj[key];
    }
  });
  return newObj;
}

export const dbSettings = async (
  settingsFile: string = DEFAULT_SETTINGS_NAME,
  args?: any,
  env: any = process.env,
) => {
  let fileSettings: DBSettings = {};
  try {
    await fs.stat(settingsFile);
    const compiled = await compileFiles([settingsFile]);
    let module = compiled[0];
    if (module?.default) {
      module = module.default;
    }
    if (module?.db) {
      fileSettings = module.db;
    } else if (module?.database) {
      fileSettings = module.database;
    }
  } catch {}

  const envSettings: DBSettings = stripUndefined(
    mapObject(env, {
      DB_HOST: "host",
      DB_DATABASE: "database",
      DB_PORT: ["port", undefined, (v) => parseInt(v)],
      DB_USER: "user",
      DB_MIGRATION_SCHEMA: "migrationSchema",
      DB_MIGRATION_TABLE: "migrationTable",
      DB_MIGRATION_FOLDER: "migrationFolder",
    }),
  );

  let argSettings: DBSettings = {};
  if (args) {
    argSettings = stripNull({
      ...args,
      port: args.port && parseInt(args.port),
      connectionString: args.connection_string,
      migrationSchema: args.schema,
      migrationTable: args.table,
      migrationFolder: args.migrations,
    });
  }

  const compiledSettings: DBSettings = {
    ...fileSettings,
    ...envSettings,
    ...argSettings,
  };
  return compiledSettings;
};

export const appSettings = async (
  settingsFile: string = DEFAULT_SETTINGS_NAME,
  args?: any,
  env: any = process.env,
) => {
  let fileSettings: Partial<AppSettings> = {};
  try {
    await fs.stat(settingsFile);
    const compiled = await compileFiles([settingsFile]);
    let module = compiled[0];
    if (module?.default) {
      module = module.default;
    }
    if (module?.app) {
      fileSettings = module.db;
    }
  } catch {}

  const envSettings: Partial<AppSettings> = stripUndefined(
    mapObject(env, {
      DB_MIGRATIONS_FOLDER: "migrationsFolder",
    }),
  );

  let argSettings: DBSettings = {};
  if (args) {
    argSettings = stripNull({
      migrationFolder: args.migrations,
    });
  }

  const compiledSettings: AppSettings = {
    migrationsFolder: DEFAULT_MIGRATIONS_FOLDER,
    ...fileSettings,
    ...envSettings,
    ...argSettings,
  };

  if (!compiledSettings.migrationsFolder) {
    throw new Error(
      `Migrations folder setting is invalid: ${compiledSettings.migrationsFolder}`,
    );
  }

  return compiledSettings;
};
