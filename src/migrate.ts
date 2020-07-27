import pg from "pg";

import crypto from "crypto";

export type MigrationClient = pg.Client | pg.PoolClient;

export type MigrationOperation =
  | string
  | ((connection: MigrationClient) => Promise<boolean>);

export class Migration {
  public hash: string;
  constructor(public serial: number, public operations: MigrationOperation[]) {
    this.hash = this.generateHash(operations);
  }

  private generateHash(operations: MigrationOperation[]): string {
    let hash = crypto.createHash("sha256");
    operations.forEach((op) => {
      if (typeof op === "string") {
        hash.update(op);
      }
    });
    return hash.digest("hex");
  }
}

export const applyMigration = async (
  connection: MigrationClient,
  migration: Migration,
  migrationSchema: string,
  migrationTable: string,
) => {
  const alreadyExists = await connection.query(
    `SELECT * FROM ${migrationSchema}.${migrationTable} WHERE id = $1`,
    [migration.serial],
  );
  if (alreadyExists.rows.length) {
    const row = alreadyExists.rows[0];
    if (migration.hash === row.hash) {
      return;
    }
    throw new Error(
      `Hash mismatch for migration ${migration.serial}. DB hash "${row.hash}". File hash "${migration.hash}".`,
    );
  }
  console.info(`Running migration ${migration.serial} (${migration.hash})`);
  for (const operation of migration.operations) {
    if (typeof operation === "string") {
      await connection.query(operation);
    } else {
      await operation(connection);
    }
  }
  await connection.query(
    `INSERT INTO ${migrationSchema}.${migrationTable} (id, hash) VALUES ($1, $2)`,
    [migration.serial, migration.hash],
  );
  console.info(
    `Finished running migration ${migration.serial} (${migration.hash})`,
  );
};

export const migrationTableExists = async (
  connection: MigrationClient,
  schema: string,
  migrationTable: string,
): Promise<boolean> => {
  const result = await connection.query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables 
      WHERE table_schema = $1
      AND table_name = $2
    )`,
    [schema, migrationTable],
  );

  return result.rows[0].exists;
};

export const createMigrationTable = async (
  connection: MigrationClient,
  schema: string,
  migrationTable: string,
) => {
  await connection.query(
    `CREATE TABLE ${schema}.${migrationTable} (
      id BIGINT NOT NULL PRIMARY KEY,
      hash TEXT NOT NULL,
      run_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
};

export const migrate = async (
  connection: MigrationClient,
  migrations: Migration[],
  schema: string,
  migrationTable: string,
  commit: boolean = true,
) => {
  if (!(await migrationTableExists(connection, schema, migrationTable))) {
    await createMigrationTable(connection, schema, migrationTable);
  }
  await connection.query("BEGIN");
  try {
    for (const migration of migrations) {
      await applyMigration(connection, migration, schema, migrationTable);
    }
    if (commit) {
      await connection.query("COMMIT");
    } else {
      await connection.query("ROLLBACK");
    }
  } catch (err) {
    await connection.query("ROLLBACK");
    throw err;
  } finally {
    if ("release" in connection) {
      connection.release();
    }
  }
};
