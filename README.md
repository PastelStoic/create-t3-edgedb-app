# Create T3-EdgeDB App

This is an app bootstrapped according to the [init.tips](https://init.tips) stack, also known as the T3-Stack. Badly modified by me.
Additional credit to [Bruno Crosier](https://github.com/brunocrosier) for making [the nextauth adapter](https://www.npmjs.com/package/@bruno_crosier/edgedb-adapter) for me.

## How is this different from the normal T3 app?

It's worse! Haha but really, it's exactly the same as the normal T3 app, but Prisma is replaced by EdgeDB. This is intended to be a reference more than an actual template - reference this for a guide on converting your existing T3 app to Edgedb.

Most relevant files are:
1. `src/pages/api/auth/[...nextauth].ts`
2. `src/server/db/client.ts`