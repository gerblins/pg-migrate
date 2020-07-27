import { Migration } from "../../../lib";

export default new Migration(2, [
  'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
  `CREATE TABLE users (
    id UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
  )`,
]);
