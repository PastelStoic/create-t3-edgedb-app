import { Account, DefaultAccount, DefaultUser } from 'next-auth';
import { Adapter, AdapterSession, AdapterUser, VerificationToken } from 'next-auth/adapters';
import { ProviderType } from 'next-auth/providers';
import { Client as EdgeDBClient } from 'edgedb';
import edgeQuery from "@edgeql-js";


export class EdgeDBAdapterError extends Error {}

const USER_SHAPE = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
} as const;

const ACCOUNT_SHAPE = {
  type: true,
  provider: true,
  providerAccountId: true,
  refresh_token: true,
  access_token: true,
  id_token: true,
  expires_at: true,
  token_type: true,
  scope: true,
  session_state: true,
} as const;

const SESSION_SHAPE = {
  id: true,
  sessionToken: true,
  expires: true,
} as const;

const VERIFICATION_TOKEN_SHAPE = {
  identifier: true,
  token: true,
  expires: true,
} as const;

export default function EdgeDBAdapter(
  edgedb: EdgeDBClient,
  e: typeof edgeQuery,
): Adapter {
  async function createUser(rawUser: Omit<AdapterUser, 'id'>): Promise<AdapterUser> {
    const user = rawUser as Omit<DefaultUser, 'id'>;
    const { id } = await e.insert(e.User, {
      ...user,
      email: user.email?.toLowerCase(),
    }).run(edgedb);

    const result = await getUser(id);

    if (!result) {
      throw new EdgeDBAdapterError("When creating user, edgedb allowed insert but returned no items.");
    }

    return result;
  }

  async function getUser(id: string): Promise<AdapterUser | null> {
    return e.select(e.User, (u) => ({
      ...USER_SHAPE,

      filter: e.op(u.id, '=', e.uuid(id)),
    })).run(edgedb);
  }

  async function getUserByEmail(email: string): Promise<AdapterUser | null> {
    return (await e.select(e.User, u => ({
      ...USER_SHAPE,

      filter: e.op(u.email, 'ilike', email),
    }))
    .assert_single()
    .run(edgedb));
  }

  async function getUserByAccount(p: Pick<Account, 'provider' | 'providerAccountId'>): Promise<AdapterUser | null> {
    const result = await e.select(e.Account, a => ({
      ...ACCOUNT_SHAPE,

      user: {
        ...USER_SHAPE,
      },

      filter: e.op(
        e.op(a.provider, '=', p.provider),
        'and',
        e.op(a.providerAccountId, '=', p.providerAccountId),
      ),
    }))
    .assert_single()
    .run(edgedb);
    if (result === null) return null;
    return result.user;
  }

  async function updateUser(user: Partial<AdapterUser>): Promise<AdapterUser> {
    if (!user.id) {
      throw new EdgeDBAdapterError("updateUser: user.id must be defined.");
    }

    const updateResult = await e.update(e.User, u => ({
      filter: e.op(u.id, '=', e.uuid(user.id ?? "")),
      set: {
        ...user,
      }
    })).run(edgedb);

    if (!updateResult) {
      throw new EdgeDBAdapterError("updateUser: attempted to update, but got null back from edgedb");
    }
    const result = await getUser(updateResult.id);
    if (result === null) throw new EdgeDBAdapterError("updateUser: attempted to retrieve modified result, but got null");
    return result;
  }

  async function deleteUser(userId: string): Promise<AdapterUser | null | undefined> {
    const user = await getUser(userId);

    if (!user) {
      return undefined;
    }

    const deleteResult = await e.delete(e.User, u => ({
      filter: e.op(u.id, '=', e.uuid(user.id)),
    })).run(edgedb);

    if (deleteResult === null || deleteResult.id !== user.id) {
      throw new Error("Error while deleting; found user but no result when deleting.");
    }

    return user;
  }

  async function linkAccount(acct: Account): Promise<Account | null | undefined> {
    const account = { ...acct } as DefaultAccount;
    // will fix this explicit any as soon as I know why everything breaks without it
    delete (account as any).userId; // eslint-disable-line

    const insertResult = await e.insert(e.Account, {
      ...account,
      user: e.select(e.User, u => ({
        filter: e.op(u.id, '=', e.uuid(acct.userId)),
      })),
    }).run(edgedb);

    const ret = await e.select(e.Account, a => ({
      ...ACCOUNT_SHAPE,
      user: USER_SHAPE,

      filter: e.op(a.id, '=', e.uuid(insertResult.id)),
    })).run(edgedb);

    if (!ret) {
      throw new EdgeDBAdapterError(`linkAccount: inserted account but not found on select: ${insertResult.id}`);
    }

    const userId = ret.user.id;

    return {
      ...ret,
      type: ret.type as ProviderType,
      scope: ret.scope ?? undefined,
      access_token: ret.access_token ?? undefined,
      token_type: ret.token_type ?? undefined,
      id_token: ret.id_token ?? undefined,
      refresh_token: ret.refresh_token ?? undefined,
      expires_at: ret.expires_at ?? undefined,
      session_state: ret.session_state ?? undefined,
      userId,
    };
  }

  async function unlinkAccount(acct: Pick<Account, 'provider' | 'providerAccountId'>): Promise<Account | undefined> {
    const foundAccount = (await e.select(e.Account, a => ({
      ...ACCOUNT_SHAPE,

      user: USER_SHAPE,

      filter: e.op(
        e.op(a.provider, '=', acct.provider),
        'and',
        e.op(a.providerAccountId, '=', acct.providerAccountId),
      ),
    })).run(edgedb))[0];

    if (!foundAccount) {
      return undefined;
    }

    const deleteResult = (await e.delete(e.Account, a => ({
      filter: e.op(
        e.op(a.provider, '=', acct.provider),
        'and',
        e.op(a.providerAccountId, '=', acct.providerAccountId),
      )
    })).run(edgedb))[0];

    const user = foundAccount.user;

    return deleteResult ? {
      ...foundAccount,
      type: foundAccount.type as ProviderType,
      scope: foundAccount.scope ?? undefined,
      access_token: foundAccount.access_token ?? undefined,
      token_type: foundAccount.token_type ?? undefined,
      id_token: foundAccount.id_token ?? undefined,
      refresh_token: foundAccount.refresh_token ?? undefined,
      expires_at: foundAccount.expires_at ?? undefined,
      session_state: foundAccount.session_state ?? undefined,
      userId: user.id,
    } : undefined;
  }

  async function createSession(session: { sessionToken: string; userId: string; expires: Date; }): Promise<AdapterSession> {
    const createResult = await e.insert(e.Session, {
      sessionToken: session.sessionToken,
      expires: session.expires,
      user: e.select(e.User, u => ({
        filter: e.op(u.id, '=', e.uuid(session.userId)),
      })),
    }).run(edgedb);

    const ret = await e.select(e.Session, s => ({
      ...SESSION_SHAPE,
      user: {
        ...USER_SHAPE,
      },
      filter: e.op(s.id, '=', e.uuid(createResult.id)),
    })).run(edgedb);

    if (!ret) {
      throw new EdgeDBAdapterError("Attempted to select just-inserted session; returned null.");
    }

    const { user, ...rest } = ret;
    return {
      ...rest,
      userId: user.id,
    };
  }

  async function getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser; } | null> {
    const session = await e.select(e.Session, s => ({
      ...SESSION_SHAPE,

      user: {
        ...USER_SHAPE,
      },

      filter: e.op(s.sessionToken, '=', sessionToken),
    })).run(edgedb);

    if (!session) {
      return null;
    }

    const user = session.user;
    // remove user object to save bandwidth?

    return { session: { ...session, userId: user.id }, user };
  }

  async function updateSession(session: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>): Promise<AdapterSession | null | undefined> {
    await e.update(e.Session, s => ({
      filter: e.op(s.sessionToken, '=', session.sessionToken),
      set: {
        ...session,
      },
    })).run(edgedb);

    // we are not going to yell if this failed because it's probably pretty reasonable
    // for the session to have been invalidated/deleted since then (active use cases)

    return (await getSessionAndUser(session.sessionToken))?.session;
  }

  async function deleteSession(sessionToken: string): Promise<AdapterSession | null | undefined> {
    const session = await e.select(e.Session, s => ({
      ...SESSION_SHAPE,

      user: { id: true },

      filter: e.op(s.sessionToken, '=', sessionToken),
    })).run(edgedb);

    if (!session) {
      return undefined;
    }

    const deleteResult = await e.delete(e.Session, s => ({
      ...SESSION_SHAPE,

      filter: e.op(s.sessionToken, '=', sessionToken),
    })).run(edgedb);

    if (deleteResult === null || deleteResult.id !== session.id) {
      throw new Error("Error while deleting; found session but no result when deleting.");
    }

    return { ...(session), userId: session.user.id };
  }

  async function createVerificationToken(verificationToken: VerificationToken): Promise<VerificationToken | null | undefined> {
    await e.insert(e.VerificationToken, {
      ...verificationToken,
    }).run(edgedb);

    return accessVerificationToken(verificationToken);
  }

  async function accessVerificationToken(params: { identifier: string; token: string; }): Promise<VerificationToken | null> {
    return e.select(e.VerificationToken, vt => ({
      ...VERIFICATION_TOKEN_SHAPE,
      filter: e.op(
        e.op(vt.identifier, '=', params.identifier),
        'and',
        e.op(vt.token, '=', params.token),
      ),
    }))
    .assert_single()
    .run(edgedb);
  }


  return {
    createUser,
    createSession,
    createVerificationToken,
    linkAccount,
    getUser,
    getSessionAndUser,
    getUserByAccount,
    getUserByEmail,
    useVerificationToken: accessVerificationToken,
    updateSession,
    updateUser,
    deleteSession,
    deleteUser,
    unlinkAccount
  };
}