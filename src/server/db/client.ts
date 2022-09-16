// src/server/db/client.ts
import { Client, createClient } from "edgedb";
import { env } from "../../env/server.mjs";

declare global {
  // eslint-disable-next-line no-var
  var edgedb: Client | undefined;
}

export const edgedb = 
global.edgedb ||
createClient();

if (env.NODE_ENV !== "production") {
  global.edgedb = edgedb;
}