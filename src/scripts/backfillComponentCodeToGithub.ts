/**
 * ONE-TIME SCRIPT — run this BEFORE applying MIGRATION.sql / redeploying
 * with the new componentLibrary schema.
 *
 * Reads every row that still has tsx_code/css_code (old schema) and
 * commits it to the frontend repo, then leaves a note of what would need
 * to be set on the new schema (githubPath/cssGithubPath/status). Run it,
 * eyeball the output, THEN run the migration.
 *
 * Usage (from backend project root, with env vars set):
 *   DATABASE_URL=... GITHUB_TOKEN=... GITHUB_OWNER=giftikabe \
 *   GITHUB_REPO_FRONTEND=kekal_frontend GITHUB_BRANCH=main \
 *   npx tsx src/scripts/backfillComponentCodeToGithub.ts
 */
import postgres from "postgres";
import { commitFileToFrontend } from "../lib/github";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const token = process.env.GITHUB_TOKEN!;
  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_REPO_FRONTEND!;
  const branch = process.env.GITHUB_BRANCH || "main";

  const rows = await sql`
    select id, name, tsx_code, css_code
    from component_library
    where coalesce(tsx_code, '') <> ''
  `;

  console.log(`Found ${rows.length} component(s) with code to migrate.`);

  for (const row of rows as any[]) {
    const tsxPath = `src/kekal/components/${row.name}.tsx`;
    const cssPath = `src/kekal/components/${row.name}.module.css`;

    const tsxResult = await commitFileToFrontend(
      token,
      owner,
      repo,
      branch,
      tsxPath,
      row.tsx_code,
      `chore: backfill ${row.name} from database to repo`
    );
    console.log(row.name, "tsx ->", tsxResult.success ? "OK" : tsxResult.error);

    if (row.css_code?.trim()) {
      const cssResult = await commitFileToFrontend(
        token,
        owner,
        repo,
        branch,
        cssPath,
        row.css_code,
        `chore: backfill ${row.name} styles from database to repo`
      );
      console.log(row.name, "css ->", cssResult.success ? "OK" : cssResult.error);
    }

    console.log(
      `  -> after migrating, set: github_path='${tsxPath}', css_github_path='${
        row.css_code?.trim() ? cssPath : "null"
      }', status='published' for id=${row.id}`
    );
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
