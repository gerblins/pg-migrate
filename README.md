# pg-migrate

pg-migrate is a simple yet powerful migration framework for PostrgeSQL.

## Configuration

There are 3 ways to configure pg-migrate:

1.  .gpgm.ts
2.  environment variables
3.  command line

The order of configuration priority is `command line > environment variables > .gpgm.ts`, so command line flags always take priority.

### .gpgm.ts

This file is compiled and executed at runtime. An example file:

```typescript
export const db = {
  host: "localhost",
  port: 5432,
  user: "postgres",
  database: "postgres",
  migrationSchema: "public",
  migrationTable: "__migrations",
};

export const app = {
  migrationsFolder: "migrations/",
};
```

### Environment Variables

```
DB_HOST
DB_DATABASE
DB_PORT
DB_USER
DB_PASSWORD
DB_MIGRATION_SCHEMA
DB_MIGRATION_TABLE

DB_MIGRATIONS_FOLDER
DB_MIGRATION_TEMPLATE
```

### Command Line

```
usage: pg-migrate [-h] [-v] [-db DATABASE] [--host HOST] [-p PORT] [-u USER]
                  [-pw PASSWORD] [-s SCHEMA] [-t TABLE]
                  [-cs CONNECTION_STRING] [-m MIGRATIONS] [-tpl TEMPLATE]
                  {migrate,create} ...

Standalone migration runner for @gerblins/pg-migration

Optional arguments:
  -h, --help            Show this help message and exit.
  -v, --version         Show program's version number and exit.
  -db DATABASE, --database DATABASE
                        Name of the database to use
  --host HOST           Host to connect to
  -p PORT, --port PORT  Port to connect to
  -u USER, --user USER  Username to use when connecting
  -pw PASSWORD, --password PASSWORD
                        Password to use when connecting
  -s SCHEMA, --schema SCHEMA
                        Schema for migrations table
  -t TABLE, --table TABLE
                        Table to keep track of migrations
  -cs CONNECTION_STRING, --connection-string CONNECTION_STRING
                        Postgres connection string
  -m MIGRATIONS, --migrations MIGRATIONS
                        Folder that contains the migrations
  -tpl TEMPLATE, --template TEMPLATE
                        Template to use for creating migrations

command:
  {migrate,create}
```

Flags for `migrate` command:

```
usage: pg-migrate migrate [-h] [--damp]

Optional arguments:
  -h, --help  Show this help message and exit.
  --damp      Runs the queries but rolls them back
```

## Migration Files

Migration files are pretty simple and can be created by running `pg-migrate create`. An example migration:

```typescript
import { Migration, MigrationClient } from "../../../lib";

export default new Migration(1, [
  "CREATE TABLE test (id uuid not null primary key, value text)",
  async (client: MigrationClient) => {
    await client.query("SELECT 1 FROM test");
    return true;
  },
]);
```

## Damp Runs

A damp run is the next step above a dry run. It actually runs the migration but rolls back the transaction. This allows you to be confident that the migrations will work in the case of a 2 part deploy (deploy code, migrate).
