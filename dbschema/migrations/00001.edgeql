CREATE MIGRATION m1l4v6tzxg7v7yju25xaja4ix5ifhvklez3wfomokxzgvtnvytwvma
    ONTO initial
{
  CREATE TYPE default::Account {
      CREATE OPTIONAL PROPERTY access_token -> std::str;
      CREATE OPTIONAL PROPERTY expires_at -> std::int64;
      CREATE OPTIONAL PROPERTY id_token -> std::str;
      CREATE REQUIRED PROPERTY provider -> std::str;
      CREATE REQUIRED PROPERTY providerAccountId -> std::str;
      CREATE OPTIONAL PROPERTY refresh_token -> std::str;
      CREATE OPTIONAL PROPERTY scope -> std::str;
      CREATE OPTIONAL PROPERTY session_state -> std::str;
      CREATE OPTIONAL PROPERTY token_type -> std::str;
      CREATE REQUIRED PROPERTY type -> std::str;
  };
  CREATE TYPE default::User {
      CREATE OPTIONAL PROPERTY email -> std::str {
          CREATE CONSTRAINT std::exclusive ON (std::str_lower(__subject__));
      };
      CREATE OPTIONAL PROPERTY emailVerified -> std::datetime;
      CREATE OPTIONAL PROPERTY image -> std::str;
      CREATE OPTIONAL PROPERTY name -> std::str;
  };
  ALTER TYPE default::Account {
      CREATE REQUIRED LINK user -> default::User;
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK accounts := (.<user[IS default::Account]);
  };
  CREATE TYPE default::Session {
      CREATE REQUIRED LINK user -> default::User;
      CREATE REQUIRED PROPERTY expires -> std::datetime;
      CREATE REQUIRED PROPERTY sessionToken -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK sessions := (.<user[IS default::Session]);
  };
  CREATE TYPE default::VerificationToken {
      CREATE REQUIRED PROPERTY identifier -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE REQUIRED PROPERTY token -> std::str;
      CREATE CONSTRAINT std::exclusive ON ((.identifier, .token));
      CREATE REQUIRED PROPERTY expires -> std::datetime;
  };
};
