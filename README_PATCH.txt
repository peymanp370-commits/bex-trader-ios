BEX final auth/legal patch from latest asli 8.zip

Replace these files in your project:
- src/app/pages/Login.tsx
- src/app/routes.tsx
- ios/App/App/Info.plist
- worker/index.js

Then run app build/sync/commit:
  npm run build
  npx cap sync ios
  git add src/app/pages/Login.tsx src/app/routes.tsx ios/App/App/Info.plist ios
  git commit -m "Fix Apple native auth token handling and legal routes"
  git push

Deploy worker separately from worker folder:
  cd worker
  npx wrangler deploy
  npx wrangler tail bex-auth-worker --format pretty

The worker logs [APPLE_NATIVE_BODY_DEBUG] with only keys and lengths, not full tokens.
