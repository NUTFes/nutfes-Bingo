import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

export default NextAuth({
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_ID!,
      clientSecret: process.env.KEYCLOAK_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
});

// clientId: process.env.KEYCLOAK_ID!,
// clientSecret: process.env.KEYCLOAK_SECRET!,
// issuer: process.env.KEYCLOAK_ISSUER!,

// clientId: "bingo",
// clientSecret: "pPerEFbxfx7bafPqbMfiPmRznEN7ZtbB",
// issuer: "https://auth.nutfes.net/realms/master",
