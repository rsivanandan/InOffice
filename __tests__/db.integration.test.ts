import * as SQLite from "expo-sqlite";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

jest.mock("expo-sqlite", () => {
  const mockRunAsync = jest.fn();
  const mockGetFirstAsync = jest.fn();
  const mockGetAllAsync = jest.fn();
  const mockExecAsync = jest.fn();

  return {
    openDatabaseAsync: jest.fn(async () => ({
      runAsync: mockRunAsync,
      getFirstAsync: mockGetFirstAsync,
      getAllAsync: mockGetAllAsync,
      execAsync: mockExecAsync,
      closeAsync: jest.fn(),
      databasePath: "file:///mock/rto.db",
    })),
    SQLiteDatabase: {},
    __mockRunAsync: mockRunAsync,
    __mockGetFirstAsync: mockGetFirstAsync,
    __mockGetAllAsync: mockGetAllAsync,
    __mockExecAsync: mockExecAsync,
  };
});

jest.mock("expo-sharing", () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

let mockBase64Result = "";

jest.mock("expo-file-system", () => {
  const mockWrite = jest.fn();
  const mockPickFileAsync = jest.fn();
  const File = jest.fn().mockImplementation((...args) => ({
    write: mockWrite,
    uri: args.length === 1 ? args[0] : `${args[0]}/${args[1]}`,
    base64: jest.fn().mockImplementation(async () => mockBase64Result),
  }));
  File.pickFileAsync = mockPickFileAsync;
  return {
    Paths: { cache: "file:///cache" },
    File,
    __mockWrite: mockWrite,
    __mockPickFileAsync: mockPickFileAsync,
  };
});

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

const {
  initDb,
  getSetting,
  setSetting,
  getDay,
  setDayStatus,
  getMonthDays,
  getAllDays,
  deleteAllData,
  exportToExcel,
  downloadSampleExcel,
  importFromExcel,
  backupDatabase,
  restoreDatabase,
} = require("../src/db");

const mocks = SQLite as unknown as {
  openDatabaseAsync: jest.Mock;
  __mockRunAsync: jest.Mock;
  __mockGetFirstAsync: jest.Mock;
  __mockGetAllAsync: jest.Mock;
  __mockExecAsync: jest.Mock;
};

const fsMocks = require("expo-file-system") as unknown as {
  File: jest.Mock;
  __mockWrite: jest.Mock;
  __mockPickFileAsync: jest.Mock;
};

describe("DB module (mocked)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("init and CRUD", () => {
    it("initDb creates tables", async () => {
      await initDb();
      expect(mocks.openDatabaseAsync).toHaveBeenCalledWith("rto.db");
      expect(mocks.__mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS days")
      );
    });

    it("getSetting returns value when found", async () => {
      mocks.__mockGetFirstAsync.mockResolvedValueOnce({ value: "60" });
      const result = await getSetting("targetPct");
      expect(result).toBe("60");
      expect(mocks.__mockGetFirstAsync).toHaveBeenCalledWith(
        "SELECT value FROM settings WHERE key = ?",
        ["targetPct"]
      );
    });

    it("getSetting returns null when not found", async () => {
      mocks.__mockGetFirstAsync.mockResolvedValueOnce(null);
      const result = await getSetting("nonexistent");
      expect(result).toBeNull();
    });

    it("setSetting runs INSERT OR REPLACE", async () => {
      await setSetting("targetPct", "70");
      expect(mocks.__mockRunAsync).toHaveBeenCalledWith(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        ["targetPct", "70"]
      );
    });

    it("getDay returns record when found", async () => {
      mocks.__mockGetFirstAsync.mockResolvedValueOnce({
        date: "2026-05-15",
        status: "in-office",
      });
      const result = await getDay("2026-05-15");
      expect(result).toEqual({ date: "2026-05-15", status: "in-office" });
    });

    it("getDay returns null when not found", async () => {
      mocks.__mockGetFirstAsync.mockResolvedValueOnce(null);
      const result = await getDay("2026-05-99");
      expect(result).toBeNull();
    });

    it("setDayStatus runs INSERT OR REPLACE", async () => {
      await setDayStatus("2026-05-15", "in-office");
      expect(mocks.__mockRunAsync).toHaveBeenCalledWith(
        "INSERT OR REPLACE INTO days (date, status) VALUES (?, ?)",
        ["2026-05-15", "in-office"]
      );
    });

    it("getMonthDays builds correct prefix", async () => {
      mocks.__mockGetAllAsync.mockResolvedValueOnce([]);
      await getMonthDays(2026, 5);
      expect(mocks.__mockGetAllAsync).toHaveBeenCalledWith(
        "SELECT date, status FROM days WHERE date LIKE ?",
        ["2026-05%"]
      );
    });

    it("getMonthDays pads single digit month", async () => {
      mocks.__mockGetAllAsync.mockResolvedValueOnce([]);
      await getMonthDays(2026, 1);
      expect(mocks.__mockGetAllAsync).toHaveBeenCalledWith(
        "SELECT date, status FROM days WHERE date LIKE ?",
        ["2026-01%"]
      );
    });

    it("getAllDays returns all records ordered by date", async () => {
      const mockDays = [
        { date: "2026-05-01", status: "in-office" },
        { date: "2026-05-05", status: "absent" },
      ];
      mocks.__mockGetAllAsync.mockResolvedValueOnce(mockDays);
      const result = await getAllDays();
      expect(result).toEqual(mockDays);
      expect(mocks.__mockGetAllAsync).toHaveBeenCalledWith(
        "SELECT date, status FROM days ORDER BY date"
      );
    });

    it("deleteAllData runs two DELETE queries", async () => {
      await deleteAllData();
      expect(mocks.__mockExecAsync).toHaveBeenCalledWith(
        "DELETE FROM days; DELETE FROM settings;"
      );
    });
  });

  describe("Excel export", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("exportToExcel writes file and shares", async () => {
      mocks.__mockGetAllAsync.mockResolvedValueOnce([
        { date: "2026-05-01", status: "in-office" },
        { date: "2026-05-04", status: "absent" },
      ]);

      await exportToExcel();

      expect(mocks.__mockGetAllAsync).toHaveBeenCalled();
      expect(fsMocks.__mockWrite).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        "file:///cache/rto-attendance.xlsx",
        expect.objectContaining({ mimeType: expect.stringContaining("spreadsheetml") })
      );
    });

    it("exportToExcel exports empty days", async () => {
      mocks.__mockGetAllAsync.mockResolvedValueOnce([]);

      await exportToExcel();

      expect(fsMocks.__mockWrite).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalled();
    });

    it("downloadSampleExcel writes sample file and shares", async () => {
      await downloadSampleExcel();

      expect(fsMocks.__mockWrite).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        "file:///cache/rto-sample.xlsx",
        expect.objectContaining({ mimeType: expect.stringContaining("spreadsheetml") })
      );
    });
  });

  describe("Excel import", () => {
    const docPicker = require("expo-document-picker") as {
      getDocumentAsync: jest.Mock;
    };

    function makeXlsxBase64(rows: { date: string; status: string }[]): string {
      const wb = XLSX.utils.book_new();
      const data = rows.length
        ? [["Date", "Status"], ...rows.map((r) => [r.date, r.status])]
        : [];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    }

    beforeEach(() => {
      jest.clearAllMocks();
      mockBase64Result = "";
    });

    it("importFromExcel returns 0 when canceled", async () => {
      docPicker.getDocumentAsync.mockResolvedValueOnce({ canceled: true });

      const result = await importFromExcel();
      expect(result).toBe(0);
    });

    it("importFromExcel inserts valid rows", async () => {
      docPicker.getDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked/test.xlsx" }],
      });
      mockBase64Result = makeXlsxBase64([
        { date: "2026-06-01", status: "in-office" },
        { date: "2026-06-02", status: "absent" },
        { date: "2026-06-03", status: "public-holiday" },
      ]);

      const result = await importFromExcel();
      expect(result).toBe(3);
      expect(mocks.__mockRunAsync).toHaveBeenCalledTimes(3);
      expect(mocks.__mockRunAsync).toHaveBeenCalledWith(
        "INSERT OR REPLACE INTO days (date, status) VALUES (?, ?)",
        ["2026-06-01", "in-office"]
      );
    });

    it("importFromExcel skips invalid rows", async () => {
      docPicker.getDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked/test.xlsx" }],
      });
      mockBase64Result = makeXlsxBase64([
        { date: "2026-06-01", status: "in-office" },
        { date: "", status: "absent" },
        { date: "2026-06-03", status: "invalid-status" },
        { date: "2026-06-05", status: "sick-leave" },
      ]);

      const result = await importFromExcel();
      expect(result).toBe(2);
      expect(mocks.__mockRunAsync).toHaveBeenCalledTimes(2);
    });

    it("importFromExcel returns 0 for empty sheet", async () => {
      docPicker.getDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked/test.xlsx" }],
      });
      mockBase64Result = makeXlsxBase64([]);

      const result = await importFromExcel();
      expect(result).toBe(0);
      expect(mocks.__mockRunAsync).not.toHaveBeenCalled();
    });

    it("importFromExcel returns 0 when sheet is missing", async () => {
      docPicker.getDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked/test.xlsx" }],
      });
      jest.spyOn(XLSX, "read").mockReturnValueOnce({
        SheetNames: ["Sheet1"],
        Sheets: {},
      });
      mockBase64Result = "fake-base64";

      const result = await importFromExcel();
      expect(result).toBe(0);
      expect(mocks.__mockRunAsync).not.toHaveBeenCalled();
    });
  });

  describe("Database backup/restore", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("backupDatabase copies db and shares", async () => {
      await backupDatabase();

      expect(fsMocks.__mockWrite).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        "file:///cache/rto-backup.db",
        expect.objectContaining({ mimeType: "application/octet-stream" })
      );
    });

    it("restoreDatabase returns false when picker canceled", async () => {
      fsMocks.__mockPickFileAsync.mockResolvedValueOnce({ canceled: true });

      const result = await restoreDatabase();

      expect(result).toBe(false);
      expect(fsMocks.__mockPickFileAsync).toHaveBeenCalledWith(
        expect.objectContaining({ mimeTypes: ["*/*"] })
      );
    });

    it("restoreDatabase writes picked file and returns true", async () => {
      const mockBase64 = "b64-content";
      fsMocks.__mockPickFileAsync.mockResolvedValueOnce({
        canceled: false,
        result: {
          base64: jest.fn().mockResolvedValue(mockBase64),
        },
      });

      const result = await restoreDatabase();

      expect(result).toBe(true);
      expect(fsMocks.__mockPickFileAsync).toHaveBeenCalled();
      expect(fsMocks.__mockWrite).toHaveBeenCalled();
      expect(mocks.__mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS days")
      );
    });
  });
});
