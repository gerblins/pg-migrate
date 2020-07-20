import { Migration } from "../../../dist";

export default new Migration(1, [
  "CREATE TABLE test (id uuid not null primary key, value text)",
]);
