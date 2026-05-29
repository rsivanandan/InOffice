import { render, fireEvent } from "@testing-library/react-native";
import MonthGrid from "../src/components/MonthGrid";

describe("MonthGrid", () => {
  it("renders weekday headers", () => {
    const { getByText } = render(
      <MonthGrid year={2026} month={5} records={[]} onUpdate={() => {}} />
    );
    expect(getByText("Sun")).toBeTruthy();
    expect(getByText("Mon")).toBeTruthy();
    expect(getByText("Tue")).toBeTruthy();
    expect(getByText("Wed")).toBeTruthy();
    expect(getByText("Thu")).toBeTruthy();
    expect(getByText("Fri")).toBeTruthy();
    expect(getByText("Sat")).toBeTruthy();
  });

  it("renders day numbers for current month", () => {
    const { getByText } = render(
      <MonthGrid year={2026} month={5} records={[]} onUpdate={() => {}} />
    );
    expect(getByText("1")).toBeTruthy();
    expect(getByText("15")).toBeTruthy();
    expect(getByText("31")).toBeTruthy();
  });

  it("renders with records", () => {
    const records = [{ date: "2026-05-15", status: "in-office" as const }];
    const { toJSON } = render(
      <MonthGrid year={2026} month={5} records={records} onUpdate={() => {}} />
    );
    expect(toJSON()).toBeDefined();
  });

  it("opens status picker when a day is pressed", () => {
    const { getByText, queryByText } = render(
      <MonthGrid year={2026} month={5} records={[]} onUpdate={() => {}} />
    );
    expect(queryByText("In Office")).toBeNull();
    fireEvent.press(getByText("15"));
    expect(getByText("In Office")).toBeTruthy();
    expect(getByText("Absent")).toBeTruthy();
  });

  it("calls onUpdate with correct toggle on long-press", () => {
    const onUpdate = jest.fn();
    const { getByText } = render(
      <MonthGrid year={2026} month={5} records={[]} onUpdate={onUpdate} />
    );
    fireEvent(getByText("15"), "onLongPress");
    expect(onUpdate).toHaveBeenCalledWith("2026-05-15", "in-office");
  });

  it("calls onUpdate with toggled status on long-press of marked day", () => {
    const onUpdate = jest.fn();
    const records = [{ date: "2026-05-15", status: "in-office" as const }];
    const { getByText } = render(
      <MonthGrid year={2026} month={5} records={records} onUpdate={onUpdate} />
    );
    fireEvent(getByText("15"), "onLongPress");
    expect(onUpdate).toHaveBeenCalledWith("2026-05-15", "absent");
  });

  it("closes picker when backdrop is pressed", () => {
    const { getByText, getByTestId, queryByText } = render(
      <MonthGrid year={2026} month={5} records={[]} onUpdate={() => {}} />
    );
    fireEvent.press(getByText("15"));
    expect(getByText("In Office")).toBeTruthy();
    fireEvent.press(getByTestId("status-picker-backdrop"));
    expect(queryByText("In Office")).toBeNull();
  });

  it("closes picker when a status is selected", () => {
    const onUpdate = jest.fn();
    const { getByText, queryByText } = render(
      <MonthGrid year={2026} month={5} records={[]} onUpdate={onUpdate} />
    );
    fireEvent.press(getByText("15"));
    expect(getByText("In Office")).toBeTruthy();
    fireEvent.press(getByText("Absent"));
    expect(onUpdate).toHaveBeenCalledWith("2026-05-15", "absent");
    expect(queryByText("In Office")).toBeNull();
  });

  it("handles December to January transition", () => {
    const { getByText } = render(
      <MonthGrid year={2026} month={1} records={[]} onUpdate={() => {}} />
    );
    expect(getByText("1")).toBeTruthy();
    expect(getByText("31")).toBeTruthy();
  });
});
