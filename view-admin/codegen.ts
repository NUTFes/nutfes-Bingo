import { config as dotenvConfig } from "dotenv";
import { CodegenConfig } from "@graphql-codegen/cli";

dotenvConfig();

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    {
      "http://api:8080/v1/graphql": {
        headers: {
          "x-hasura-admin-secret":
            process.env.HASURA_GRAPHQL_ADMIN_SECRET || "",
        },
      },
    },
  ],
  documents: "src/gql/*.gql",
  hooks: {
    afterAllFileWrite: ["prettier --write"],
  },
  generates: {
    "./src/type/graphql.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo",
      ],
      config: {
        namingConvention: {
          typeNames: "change-case-all#pascalCase",
          enumValues: "change-case-all#camelCase",
          fieldNames: "change-case-all#camelCase",
        },
        transformUnderscore: "true",
        gqlImport: "@apollo/client#gql",
        withHooks: false,
        withHOC: false,
        withComponent: false,
      },
    },
  },
};

export default config;
