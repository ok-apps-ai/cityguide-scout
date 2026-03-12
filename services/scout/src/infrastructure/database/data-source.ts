import { DataSource } from "typeorm";

import databaseConfig from "./database.config";

const url = process.env.POSTGRES_URL ?? "postgres://postgres:password@127.0.0.1/scout-development";

export default new DataSource({
  ...databaseConfig,
  url,
});
