// path: scripts/run-seed.ts
import Database from 'better-sqlite3';
import { getDefaultDatabasePath } from '../src/main/db/connection';
import { runMigrations } from '../src/main/db/migrator';
import { seedDatabase } from '../src/main/db/seed';

async function main(): Promise<void> {
  const dbPath = getDefaultDatabasePath();
  console.info(`[Seed CLI] Target database: ${dbPath}`);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  await runMigrations(db, dbPath);
  const result = seedDatabase(db, true);
  db.close();

  console.info(
    `[Seed CLI] Successfully seeded ${result.clientCount} clients, ${result.invoiceCount} invoices, and ${result.expenseCount} expenses.`
  );
}

main().catch(err => {
  console.error('[Seed CLI] Error:', err);
  process.exit(1);
});
