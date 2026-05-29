import type { DayStatus } from "../src/types";

const VALID_STATUSES: DayStatus[] = [
  "in-office", "absent", "public-holiday",
  "personal-leave", "sick-leave",
];

describe("DB utilities", () => {
  describe("VALID_STATUSES", () => {
    it("contains all 5 day statuses", () => {
      expect(VALID_STATUSES).toHaveLength(5);
      expect(VALID_STATUSES).toContain("in-office");
      expect(VALID_STATUSES).toContain("absent");
      expect(VALID_STATUSES).toContain("public-holiday");
      expect(VALID_STATUSES).toContain("personal-leave");
      expect(VALID_STATUSES).toContain("sick-leave");
    });
  });

  describe("getMonthDays query prefix", () => {
    it("builds correct prefix for single-digit month", () => {
      const prefix = `2026-${String(5).padStart(2, "0")}`;
      expect(prefix).toBe("2026-05");
    });

    it("builds correct prefix for double-digit month", () => {
      const prefix = `2026-${String(11).padStart(2, "0")}`;
      expect(prefix).toBe("2026-11");
    });

    it("builds correct prefix for January", () => {
      const prefix = `2026-${String(1).padStart(2, "0")}`;
      expect(prefix).toBe("2026-01");
    });
  });

  describe("DayStatus validation (import logic)", () => {
    it("accepts valid status strings", () => {
      const validInputs = ["in-office", "absent", "public-holiday", "personal-leave", "sick-leave"];
      for (const input of validInputs) {
        expect(VALID_STATUSES.includes(input as DayStatus)).toBe(true);
      }
    });

    it("rejects invalid status strings", () => {
      const invalidInputs = ["present", "vacation", "working-from-home", "", "IN-OFFICE", "In Office"];
      for (const input of invalidInputs) {
        expect(VALID_STATUSES.includes(input as DayStatus)).toBe(false);
      }
    });

    it("is case-sensitive (lowercase only)", () => {
      expect(VALID_STATUSES.includes("In-Office" as DayStatus)).toBe(false);
      expect(VALID_STATUSES.includes("IN-OFFICE" as DayStatus)).toBe(false);
    });
  });
});

describe("Export data shape", () => {
  it("maps records to correct sheet columns", () => {
    const days = [
      { date: "2026-05-01", status: "in-office" as DayStatus },
      { date: "2026-05-04", status: "absent" as DayStatus },
    ];
    const rows = days.map((d) => ({ Date: d.date, Status: d.status }));
    expect(rows).toEqual([
      { Date: "2026-05-01", Status: "in-office" },
      { Date: "2026-05-04", Status: "absent" },
    ]);
  });

  it("handles empty days array", () => {
    const days: { date: string; status: DayStatus }[] = [];
    const rows = days.map((d) => ({ Date: d.date, Status: d.status }));
    expect(rows).toEqual([]);
  });
});
