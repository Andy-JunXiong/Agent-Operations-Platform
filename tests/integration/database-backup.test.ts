import { existsSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDatabaseBackup,
  verifyDatabaseFile,
} from "../../scripts/backup-database.js";
import { WorkspaceService } from "../../src/application/workspace-service.js";
import { openDatabase } from "../../src/persistence/database.js";

describe("SQLite-consistent cloud backup", () => {
  it("verifies an active WAL database without changing its mode or data", () => {
    const root = mkdtempSync(join(tmpdir(), "paw-verify-wal-")), path = join(root,"workspace.db");
    const db = openDatabase(path);
    try {
      db.exec("CREATE TABLE verification_sentinel(value TEXT); INSERT INTO verification_sentinel VALUES('preserved')");
      const digest = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
      const before = digest(path), wal = digest(`${path}-wal`);
      expect(verifyDatabaseFile(path).integrity).toBe("ok");
      expect(db.pragma("journal_mode", {simple:true})).toBe("wal");
      expect(digest(path)).toBe(before);
      expect(digest(`${path}-wal`)).toBe(wal);
      expect(db.prepare("SELECT value FROM verification_sentinel").get()).toEqual({value:"preserved"});
    } finally { db.close(); rmSync(root,{recursive:true,force:true}); }
  });

  it("rejects orphaned foreign keys and missing paths without repairing or creating files", () => {
    const root = mkdtempSync(join(tmpdir(), "paw-verify-fk-")), path = join(root,"invalid.db");
    const db = new Database(path);
    try {
      db.pragma("foreign_keys = OFF");
      db.exec("CREATE TABLE schema_migrations(version TEXT); CREATE TABLE parent(id INTEGER PRIMARY KEY); CREATE TABLE child(id INTEGER REFERENCES parent(id)); INSERT INTO child VALUES(99)");
    } finally { db.close(); }
    try {
      const before = readFileSync(path);
      expect(() => verifyDatabaseFile(path)).toThrow(/foreign key/);
      expect(readFileSync(path)).toEqual(before);
      const missing = join(root,"missing.db");
      expect(() => verifyDatabaseFile(missing)).toThrow(/does not exist/);
      expect(existsSync(missing)).toBe(false);
    } finally { rmSync(root,{recursive:true,force:true}); }
  });

  it("backs up a live WAL database, verifies it, and retains only bounded backups", async () => {
    const root = mkdtempSync(join(tmpdir(), "paw-database-backup-"));
    const databasePath = join(root, "data", "workspace.db");
    const backupDirectory = join(root, "backups");
    const database = openDatabase(databasePath);
    const service = new WorkspaceService(
      database,
      {
        issuer: "backup-test",
        subject: "single-user",
        workspaceName: "Backup Test Workspace",
      },
      { timeZone: "Australia/Sydney" },
    );
    const identity = service.ensureDevelopmentIdentity();

    const first = await createDatabaseBackup({
      databasePath,
      backupDirectory,
      retentionCount: 2,
      now: new Date("2026-09-05T00:00:00.000Z"),
    });
    const second = await createDatabaseBackup({
      databasePath,
      backupDirectory,
      retentionCount: 2,
      now: new Date("2026-09-05T01:00:00.000Z"),
    });
    const unrelated = join(backupDirectory, "keep-me.txt");
    writeFileSync(unrelated, "not a database backup", "utf8");
    const third = await createDatabaseBackup({
      databasePath,
      backupDirectory,
      retentionCount: 2,
      now: new Date("2026-09-05T02:00:00.123Z"),
    });
    database.close();

    expect(first.integrity).toBe("ok");
    expect(existsSync(first.backupPath)).toBe(false);
    expect(existsSync(second.backupPath)).toBe(true);
    expect(existsSync(third.backupPath)).toBe(true);
    expect(existsSync(`${third.backupPath}-wal`)).toBe(false);
    expect(existsSync(`${third.backupPath}-shm`)).toBe(false);
    expect(existsSync(`${third.backupPath}.partial`)).toBe(false);
    expect(existsSync(`${third.backupPath}.partial-wal`)).toBe(false);
    expect(existsSync(`${third.backupPath}.partial-shm`)).toBe(false);
    expect(existsSync(unrelated)).toBe(true);
    expect(third.removedBackups).toEqual([
      "workspace-20260905T000000Z.db",
    ]);

    const restored = openDatabase(third.backupPath);
    try {
      expect(
        restored.prepare("SELECT id FROM workspaces WHERE id = ?").get(
          identity.workspaceId,
        ),
      ).toBeTruthy();
    } finally {
      restored.close();
    }
    expect(verifyDatabaseFile(third.backupPath)).toEqual({
      integrity: "ok",
      migrations: [
        "001_integration_spike.sql",
        "002_real_job_application_inventory.sql",
        "003_task_attention.sql",
        "004_web_identity_links.sql",
        "005_task_command_audit.sql",
        "006_job_candidates.sql",
        "007_candidate_links.sql",
        "008_recommendation_runs.sql",
        "009_mail_scan_runs.sql",
        "010_mail_scan_batches.sql",
        "011_mail_ingestion_identity.sql",
        "012_mail_scan_backend_ledger.sql",
        "013_mail_body_read_progress.sql",
        "014_job_mail_search.sql",
        "015_job_library.sql",
        "016_resume_editor.sql",
        "017_platform_watch_reports.sql",
        "018_resume_variants.sql",
        "019_candidate_match_assessments.sql",
        "020_candidate_screening.sql",
      ],
    });
  });
});
