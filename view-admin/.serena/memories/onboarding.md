Onboarding for `view-admin`:

1. Install dependencies (inside Docker container if applicable):
   - npm ci
2. Environment:
   - Configure env vars (NextAuth, GraphQL endpoint, MinIO, etc.)
3. Development:
   - npm run dev
4. Linting:
   - npm run lint
5. Build/Start:
   - npm run build && npm run start
6. GraphQL codegen (if schema or queries change):
   - npm run codegen
