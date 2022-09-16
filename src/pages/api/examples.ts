// src/pages/api/examples.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { edgedb } from "../../server/db/client";

const examples = async (req: NextApiRequest, res: NextApiResponse) => {
  const examples = await edgedb.query("select Example { message }"); // I could use the querybuilder for this but eh
  res.status(200).json(examples);
};

export default examples;
