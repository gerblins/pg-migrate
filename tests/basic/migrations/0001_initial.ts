import { Migration } from "../../../lib";

export default new Migration(1, [
  "CREATE TABLE test (id uuid not null primary key, value text)",
]);
