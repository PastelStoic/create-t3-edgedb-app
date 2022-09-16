import { createRouter } from "./context";
import e from "@edgeql-js";
import { z } from "zod";

export const exampleRouter = createRouter()
  .query("hello", {
    input: z
      .object({
        text: z.string().nullish(),
      })
      .nullish(),
    resolve({ input }) {
      return {
        greeting: `Hello ${input?.text ?? "world"}`,
      };
    },
  })
  .query("getAll", {
    async resolve({ ctx }) {
      const query = e.select(e.Example, () => ({
        message: true,
      }));
      return await query.run(ctx.edgedb);
    },
  });
