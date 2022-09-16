module default {
    type Account {
    required property type -> str;

    required property provider -> str;
    required property providerAccountId -> str;

    optional property refresh_token -> str;
    optional property access_token -> str;
    optional property id_token -> str;
    optional property expires_at -> int64;

    optional property token_type -> str;
    optional property scope -> str;
    optional property session_state -> str;

    required link user -> User;
  }

  type Session {
    required property sessionToken -> str {
      constraint exclusive;
    }
    required property expires -> datetime;

    required link user -> User;
  }

  type User {
    optional property name -> str;
    optional property email -> str {
      constraint exclusive on (str_lower(__subject__));
    }
    optional property emailVerified -> datetime;
    optional property image -> str;

    multi link accounts := .<user[is Account];
    multi link sessions := .<user[is Session];
  }

  type VerificationToken {
    required property identifier -> str { constraint exclusive };
    required property token -> str;
    required property expires -> datetime;

    constraint exclusive on ( (.identifier, .token) );
  }
}