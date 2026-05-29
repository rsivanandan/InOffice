import { render, fireEvent } from "@testing-library/react-native";
import StatusPicker from "../src/components/StatusPicker";

describe("StatusPicker", () => {
  it("renders date label", () => {
    const { getByText } = render(
      <StatusPicker
        visible
        dateLabel="May 15, 2026"
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    expect(getByText("May 15, 2026")).toBeTruthy();
  });

  it("shows all 5 status options", () => {
    const { getByText } = render(
      <StatusPicker
        visible
        dateLabel=""
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    expect(getByText("In Office")).toBeTruthy();
    expect(getByText("Absent")).toBeTruthy();
    expect(getByText("Public Holiday")).toBeTruthy();
    expect(getByText("Personal Leave")).toBeTruthy();
    expect(getByText("Sick Leave")).toBeTruthy();
  });

  it("calls onSelect with correct status when option tapped", () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <StatusPicker
        visible
        dateLabel=""
        onSelect={onSelect}
        onClose={() => {}}
      />
    );
    fireEvent.press(getByText("Public Holiday"));
    expect(onSelect).toHaveBeenCalledWith("public-holiday");
  });

  it("calls onSelect with in-office", () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <StatusPicker
        visible
        dateLabel=""
        onSelect={onSelect}
        onClose={() => {}}
      />
    );
    fireEvent.press(getByText("In Office"));
    expect(onSelect).toHaveBeenCalledWith("in-office");
  });

  it("calls onClose when backdrop pressed", () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <StatusPicker
        visible
        dateLabel=""
        onSelect={() => {}}
        onClose={onClose}
      />
    );
    const backdrop = getByTestId("status-picker-backdrop");
    fireEvent.press(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});
