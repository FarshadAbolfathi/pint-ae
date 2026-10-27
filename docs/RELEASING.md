# Releasing

Publishing is **not** automated on merge; it happens when you push a version
tag. These are the one-time setup and per-release steps for the maintainer.

## One-time setup

1. **npm account & org.** Log in locally and make sure you can publish the
   `@pint-ae` scope:

   ```sh
   npm login
   npm whoami
   ```

2. **Automation token.** Create an npm **Automation** access token (npm →
   Access Tokens → Generate → Automation), then add it as a GitHub Actions
   secret named `NPM_TOKEN`:

   ```sh
   gh secret set NPM_TOKEN
   # paste the token when prompted
   ```

3. **Repository topics** (for discoverability):

   ```sh
   gh repo edit --add-topic uae,e-invoicing,peppol,pint,ubl,einvoicing,vat,typescript,sdk,fatca
   ```

   (Adjust as you like; GitHub allows up to 20 topics.)

## Per-release steps

1. Record changes with a changeset and let it bump versions:

   ```sh
   pnpm changeset            # describe the change, pick bump levels
   pnpm changeset version    # updates package versions + CHANGELOGs
   git commit -am "chore: version packages"
   ```

2. Verify a clean build and the published contents:

   ```sh
   pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build
   pnpm -r --filter "./packages/*" exec publint
   pnpm -r --filter "./packages/*" pack --dry-run   # inspect tarball contents
   ```

3. Tag and push — the `release` workflow publishes to npm using `NPM_TOKEN`:

   ```sh
   git tag v0.1.0
   git push origin v0.1.0
   ```

4. After the first publish, update the npm badge and remove the
   "once published" note from the README quick start.

> The `release` workflow (`.github/workflows/release.yml`) runs
> `pnpm -r --filter "./packages/*" publish --access public` with provenance.
> `workspace:*` dependencies are replaced with real versions automatically.
