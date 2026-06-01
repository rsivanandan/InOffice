import { format } from "date-fns";
import { File, Directory, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { getSetting, setSetting, getDb, initDb } from "../db";
import { getCloudModule } from "../../modules/cloud-backup";

const BACKUP_DIR = "InOfficeBackups";
const BACKUP_PREFIX = "inoffice_backup_";
const MAX_BACKUPS = 3;
const SETTING_LAST_BACKUP = "backup_last_date";
const SETTING_AUTO_BACKUP = "backup_auto_enabled";

async function getBackupDir(): Promise<Directory> {
  const dir = new Directory(Paths.document, BACKUP_DIR);
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

function getBackupFileName(): string {
  return `${BACKUP_PREFIX}${format(new Date(), "yyyy-MM-dd")}.db`;
}

function parseBackupDate(fileName: string): string {
  return fileName.replace(BACKUP_PREFIX, "").replace(".db", "");
}

export async function performBackup(): Promise<{ success: boolean; message: string }> {
  try {
    await initDb();
    const data = await getDb().serializeAsync();
    const fileName = getBackupFileName();
    const localDir = await getBackupDir();

    const localFile = new File(localDir, fileName);
    localFile.write(data);

    const cloudModule = getCloudModule();
    if (cloudModule && await cloudModule.isCloudAvailable()) {
      try {
        await cloudModule.uploadBackup(localFile.uri, fileName);
      } catch {
        // Cloud upload is optional — backup succeeds without it
      }
    }

    cleanupOldLocalBackups(localDir);

    const now = new Date().toISOString();
    await setSetting(SETTING_LAST_BACKUP, now);

    return { success: true, message: `Backup saved as ${fileName}` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Backup failed",
    };
  }
}

export async function restoreFromCloudBackup(fileName: string): Promise<{ success: boolean; message: string }> {
  try {
    const cloudModule = getCloudModule();
    if (!cloudModule) {
      return { success: false, message: "Cloud backup not available on this device" };
    }

    const isAvail = await cloudModule.isCloudAvailable();
    if (!isAvail) {
      return { success: false, message: "Cloud storage is not signed in" };
    }

    const localDir = await getBackupDir();
    const downloadedPath = await cloudModule.downloadBackup(fileName, localDir.uri);

    const file = new File(downloadedPath);
    const content = await file.bytes();

    await initDb();
    const memDb = await SQLite.deserializeDatabaseAsync(content);
    await SQLite.backupDatabaseAsync({
      sourceDatabase: memDb,
      destDatabase: getDb(),
    });

    return { success: true, message: `Restored from ${fileName}` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Restore failed",
    };
  }
}

export async function getLastBackupDate(): Promise<string | null> {
  try {
    return await getSetting(SETTING_LAST_BACKUP);
  } catch {
    return null;
  }
}

export async function isAutoBackupEnabled(): Promise<boolean> {
  try {
    const val = await getSetting(SETTING_AUTO_BACKUP);
    return val === "true";
  } catch {
    return false;
  }
}

export async function setAutoBackupEnabled(enabled: boolean): Promise<void> {
  await setSetting(SETTING_AUTO_BACKUP, enabled ? "true" : "false");
}

export async function listCloudBackups(): Promise<string[]> {
  try {
    const cloudModule = getCloudModule();
    if (!cloudModule) return [];

    const isAvail = await cloudModule.isCloudAvailable();
    if (!isAvail) return [];

    const backups = await cloudModule.listBackups();
    return backups.filter((b) => b.startsWith(BACKUP_PREFIX));
  } catch {
    return [];
  }
}

function cleanupOldLocalBackups(dir: Directory): void {
  try {
    const entries = dir.list();
    const backups = entries
      .filter((e) => "name" in e && e.name.startsWith(BACKUP_PREFIX))
      .sort((a, b) => a.name.localeCompare(b.name))
      .reverse();

    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      for (const entry of toDelete) {
        try {
          if ("delete" in entry && typeof entry.delete === "function") {
            entry.delete();
          }
        } catch {
        }
      }
    }
  } catch {
  }
}

export async function hasCloudBackups(): Promise<boolean> {
  const backups = await listCloudBackups();
  return backups.length > 0;
}

export async function deleteAllCloudBackups(): Promise<{ success: boolean; message: string }> {
  try {
    const cloudModule = getCloudModule();
    if (!cloudModule) {
      return { success: false, message: "Cloud backup not available on this device" };
    }

    const isAvail = await cloudModule.isCloudAvailable();
    if (!isAvail) {
      return { success: false, message: "Cloud storage is not signed in" };
    }

    const backups = await listCloudBackups();
    if (backups.length === 0) {
      return { success: true, message: "No cloud backups to delete" };
    }

    let deleted = 0;
    let failed = 0;
    for (const name of backups) {
      try {
        await cloudModule.deleteBackup(name);
        deleted++;
      } catch {
        failed++;
      }
    }

    return {
      success: true,
      message: failed > 0
        ? `Deleted ${deleted} backup(s), ${failed} failed`
        : `Deleted ${deleted} backup(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete cloud backups",
    };
  }
}
