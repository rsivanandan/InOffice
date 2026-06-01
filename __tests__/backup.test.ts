jest.mock("expo-sqlite", () => {
  const mockSerializeAsync = jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
  const mockCloseAsync = jest.fn();
  const mockDeserializeAsync = jest.fn().mockResolvedValue({ name: ":memory:" });
  const mockBackupAsync = jest.fn();

  return {
    openDatabaseAsync: jest.fn(async () => ({
      serializeAsync: mockSerializeAsync,
      closeAsync: mockCloseAsync,
    })),
    deserializeDatabaseAsync: mockDeserializeAsync,
    backupDatabaseAsync: mockBackupAsync,
    __mockSerializeAsync: mockSerializeAsync,
    __mockCloseAsync: mockCloseAsync,
    __mockDeserializeAsync: mockDeserializeAsync,
    __mockBackupAsync: mockBackupAsync,
  };
});

jest.mock("expo-file-system", () => {
  const mockDirExists = jest.fn(() => true);
  const mockDirCreate = jest.fn();
  const mockDirList = jest.fn(() => []);
  const mockFileWrite = jest.fn();
  const mockFileBytes = jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
  const mockFileDelete = jest.fn();
  const Directory = jest.fn().mockImplementation((...args) => ({
    exists: true,
    create: mockDirCreate,
    list: mockDirList,
    uri: args.length === 1 ? args[0] : `${args[0]}/${args[1]}`,
    name: args[args.length - 1],
  }));
  const File = jest.fn().mockImplementation((...args) => ({
    write: mockFileWrite,
    bytes: mockFileBytes,
    delete: mockFileDelete,
    uri: args.length === 1 ? args[0] : `${args[0]}/${args[1]}`,
    name: args[args.length - 1] || "",
  }));
  return {
    Paths: { document: "file:///documents", cache: "file:///cache" },
    File,
    Directory,
    __mockDirExists: mockDirExists,
    __mockDirCreate: mockDirCreate,
    __mockDirList: mockDirList,
    __mockFileWrite: mockFileWrite,
    __mockFileBytes: mockFileBytes,
    __mockFileDelete: mockFileDelete,
  };
});

jest.mock("../src/db", () => {
  const mockGetSetting = jest.fn();
  const mockSetSetting = jest.fn();
  const mockSerialize = jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
  const mockGetDb = jest.fn(() => ({ serializeAsync: mockSerialize }));
  const mockInitDb = jest.fn();

  return {
    getSetting: mockGetSetting,
    setSetting: mockSetSetting,
    getDb: mockGetDb,
    initDb: mockInitDb,
    __mockGetSetting: mockGetSetting,
    __mockSetSetting: mockSetSetting,
    __mockGetDb: mockGetDb,
    __mockInitDb: mockInitDb,
    __mockSerialize: mockSerialize,
  };
});

jest.mock("../modules/cloud-backup", () => {
  const mockCloudModule = {
    isCloudAvailable: jest.fn(),
    uploadBackup: jest.fn(),
    downloadBackup: jest.fn(),
    listBackups: jest.fn(),
    deleteBackup: jest.fn(),
  };
  return {
    getCloudModule: jest.fn(() => mockCloudModule),
    __mockCloudModule: mockCloudModule,
  };
});

import {
  performBackup,
  restoreFromCloudBackup,
  getLastBackupDate,
  isAutoBackupEnabled,
  setAutoBackupEnabled,
  listCloudBackups,
  hasCloudBackups,
} from "../src/utils/backup";

import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";

const sqliteMocks = SQLite as unknown as {
  __mockSerializeAsync: jest.Mock;
  __mockDeserializeAsync: jest.Mock;
  __mockBackupAsync: jest.Mock;
};

const fsMocks = FileSystem as unknown as {
  File: jest.Mock;
  Directory: jest.Mock;
  __mockDirCreate: jest.Mock;
  __mockDirList: jest.Mock;
  __mockFileWrite: jest.Mock;
  __mockFileBytes: jest.Mock;
  __mockFileDelete: jest.Mock;
};

const dbMocks = jest.requireMock("../src/db") as {
  __mockGetSetting: jest.Mock;
  __mockSetSetting: jest.Mock;
  __mockGetDb: jest.Mock;
  __mockInitDb: jest.Mock;
  __mockSerialize: jest.Mock;
};

const cloudMocks = jest.requireMock("../modules/cloud-backup") as {
  __mockCloudModule: {
    isCloudAvailable: jest.Mock;
    uploadBackup: jest.Mock;
    downloadBackup: jest.Mock;
    listBackups: jest.Mock;
    deleteBackup: jest.Mock;
  };
};

const mockCloudModule = cloudMocks.__mockCloudModule;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("performBackup", () => {
  it("saves local backup and records timestamp when cloud unavailable", async () => {
    mockCloudModule.isCloudAvailable.mockResolvedValue(false);

    const result = await performBackup();

    expect(result.success).toBe(true);
    expect(result.message).toContain("inoffice_backup_");
    expect(fsMocks.__mockFileWrite).toHaveBeenCalled();
    expect(dbMocks.__mockSetSetting).toHaveBeenCalledWith(
      "backup_last_date",
      expect.any(String)
    );
  });

  it("uploads to cloud when available", async () => {
    mockCloudModule.isCloudAvailable.mockResolvedValue(true);
    mockCloudModule.uploadBackup.mockResolvedValue("/cloud/path");

    const result = await performBackup();

    expect(result.success).toBe(true);
    expect(mockCloudModule.uploadBackup).toHaveBeenCalledWith(
      expect.stringContaining("inoffice_backup_"),
      expect.stringContaining("inoffice_backup_")
    );
  });

  it("does not fail when cloud upload throws", async () => {
    mockCloudModule.isCloudAvailable.mockResolvedValue(true);
    mockCloudModule.uploadBackup.mockRejectedValue(new Error("Network error"));

    const result = await performBackup();

    expect(result.success).toBe(true);
  });

  it("returns error when serialization fails", async () => {
    dbMocks.__mockSerialize.mockRejectedValueOnce(new Error("Disk full"));

    const result = await performBackup();

    expect(result.success).toBe(false);
    expect(result.message).toBe("Disk full");
  });

  it("cleans up old backups beyond MAX_BACKUPS (3)", async () => {
    const existingBackups = [
      "inoffice_backup_2026-05-01.db",
      "inoffice_backup_2026-05-02.db",
      "inoffice_backup_2026-05-03.db",
      "inoffice_backup_2026-05-04.db",
      "inoffice_backup_2026-05-05.db",
    ];
    const mockEntries = existingBackups.map((name) => ({
      name,
      delete: jest.fn(),
    }));
    fsMocks.__mockDirList.mockReturnValue(mockEntries);

    const result = await performBackup();

    expect(result.success).toBe(true);
    const deleted = mockEntries.filter((e) => e.delete.mock.calls.length > 0);
    expect(deleted).toHaveLength(2);
    expect(deleted.map((e) => e.name)).toEqual([
      "inoffice_backup_2026-05-01.db",
      "inoffice_backup_2026-05-02.db",
    ]);
  });
});

describe("restoreFromCloudBackup", () => {
  it("returns error when cloud module is null", async () => {
    const { getCloudModule } = jest.requireMock("../modules/cloud-backup");
    getCloudModule.mockReturnValueOnce(null);

    const result = await restoreFromCloudBackup("inoffice_backup_2026-05-01.db");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Cloud backup not available on this device");
  });

  it("returns error when cloud is not signed in", async () => {
    mockCloudModule.isCloudAvailable.mockResolvedValue(false);

    const result = await restoreFromCloudBackup("inoffice_backup_2026-05-01.db");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Cloud storage is not signed in");
  });

  it("downloads, deserializes, and restores database", async () => {
    mockCloudModule.isCloudAvailable.mockResolvedValue(true);
    mockCloudModule.downloadBackup.mockResolvedValue(
      "file:///documents/InOfficeBackups/inoffice_backup_2026-05-01.db"
    );

    const result = await restoreFromCloudBackup("inoffice_backup_2026-05-01.db");

    expect(result.success).toBe(true);
    expect(mockCloudModule.downloadBackup).toHaveBeenCalledWith(
      "inoffice_backup_2026-05-01.db",
      expect.any(String)
    );
    expect(sqliteMocks.__mockDeserializeAsync).toHaveBeenCalled();
    expect(sqliteMocks.__mockBackupAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceDatabase: expect.objectContaining({ name: ":memory:" }),
        destDatabase: expect.any(Object),
      })
    );
  });

  it("returns error when download fails", async () => {
    mockCloudModule.isCloudAvailable.mockResolvedValue(true);
    mockCloudModule.downloadBackup.mockRejectedValue(
      new Error("File not found")
    );

    const result = await restoreFromCloudBackup("inoffice_backup_2026-05-01.db");

    expect(result.success).toBe(false);
    expect(result.message).toBe("File not found");
  });
});

describe("getLastBackupDate", () => {
  it("returns date string when set", async () => {
    dbMocks.__mockGetSetting.mockResolvedValueOnce("2026-05-15T10:00:00.000Z");

    const result = await getLastBackupDate();

    expect(result).toBe("2026-05-15T10:00:00.000Z");
    expect(dbMocks.__mockGetSetting).toHaveBeenCalledWith("backup_last_date");
  });

  it("returns null when never backed up", async () => {
    dbMocks.__mockGetSetting.mockResolvedValueOnce(null);

    const result = await getLastBackupDate();

    expect(result).toBeNull();
  });

  it("returns null on error", async () => {
    dbMocks.__mockGetSetting.mockRejectedValueOnce(new Error("DB closed"));

    const result = await getLastBackupDate();

    expect(result).toBeNull();
  });
});

describe("isAutoBackupEnabled", () => {
  it("returns true when setting is 'true'", async () => {
    dbMocks.__mockGetSetting.mockResolvedValueOnce("true");

    const result = await isAutoBackupEnabled();

    expect(result).toBe(true);
  });

  it("returns false when setting is 'false'", async () => {
    dbMocks.__mockGetSetting.mockResolvedValueOnce("false");

    const result = await isAutoBackupEnabled();

    expect(result).toBe(false);
  });

  it("returns false when setting is null", async () => {
    dbMocks.__mockGetSetting.mockResolvedValueOnce(null);

    const result = await isAutoBackupEnabled();

    expect(result).toBe(false);
  });

  it("returns false on error", async () => {
    dbMocks.__mockGetSetting.mockRejectedValueOnce(new Error("DB closed"));

    const result = await isAutoBackupEnabled();

    expect(result).toBe(false);
  });
});

describe("setAutoBackupEnabled", () => {
  it("stores 'true' when enabled", async () => {
    await setAutoBackupEnabled(true);

    expect(dbMocks.__mockSetSetting).toHaveBeenCalledWith(
      "backup_auto_enabled",
      "true"
    );
  });

  it("stores 'false' when disabled", async () => {
    await setAutoBackupEnabled(false);

    expect(dbMocks.__mockSetSetting).toHaveBeenCalledWith(
      "backup_auto_enabled",
      "false"
    );
  });
});

describe("listCloudBackups", () => {
  it("returns empty list when cloud module is null", async () => {
    const { getCloudModule } = jest.requireMock("../modules/cloud-backup");
    getCloudModule.mockReturnValueOnce(null);

    const result = await listCloudBackups();

    expect(result).toEqual([]);
  });

  it("returns empty list when cloud is not signed in", async () => {
    mockCloudModule.isCloudAvailable.mockResolvedValue(false);

    const result = await listCloudBackups();

    expect(result).toEqual([]);
  });

  it("returns filtered backup filenames", async () => {
    mockCloudModule.isCloudAvailable.mockResolvedValue(true);
    mockCloudModule.listBackups.mockResolvedValue([
      "inoffice_backup_2026-05-01.db",
      "inoffice_backup_2026-05-02.db",
      "other_file.txt",
      "inoffice_backup_2026-05-03.db",
    ]);

    const result = await listCloudBackups();

    expect(result).toEqual([
      "inoffice_backup_2026-05-01.db",
      "inoffice_backup_2026-05-02.db",
      "inoffice_backup_2026-05-03.db",
    ]);
  });

  it("returns empty list on error", async () => {
    mockCloudModule.isCloudAvailable.mockResolvedValue(true);
    mockCloudModule.listBackups.mockRejectedValue(new Error("Network error"));

    const result = await listCloudBackups();

    expect(result).toEqual([]);
  });
});

describe("hasCloudBackups", () => {
  it("returns true when backups exist", async () => {
    mockCloudModule.isCloudAvailable.mockResolvedValue(true);
    mockCloudModule.listBackups.mockResolvedValue([
      "inoffice_backup_2026-05-01.db",
    ]);

    const result = await hasCloudBackups();

    expect(result).toBe(true);
  });

  it("returns false when no backups exist", async () => {
    mockCloudModule.isCloudAvailable.mockResolvedValue(true);
    mockCloudModule.listBackups.mockResolvedValue([]);

    const result = await hasCloudBackups();

    expect(result).toBe(false);
  });
});
