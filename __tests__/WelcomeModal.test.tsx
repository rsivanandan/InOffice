import { render, fireEvent } from "@testing-library/react-native";
import WelcomeModal from "../src/components/WelcomeModal";

describe("WelcomeModal", () => {
  it("renders app title and subtitle", () => {
    const { getByText } = render(
      <WelcomeModal visible onDismiss={() => {}} />
    );
    expect(getByText("InOffice")).toBeTruthy();
    expect(getByText("Track Your Office Days")).toBeTruthy();
  });

  it("renders Get Started button", () => {
    const { getByText } = render(
      <WelcomeModal visible onDismiss={() => {}} />
    );
    expect(getByText("Get Started")).toBeTruthy();
  });

  it("renders copyright", () => {
    const { getByText } = render(
      <WelcomeModal visible onDismiss={() => {}} />
    );
    const year = new Date().getFullYear();
    expect(getByText(`© ${year} Rajesh T Sivanandan. All rights reserved.`)).toBeTruthy();
  });

  it("renders all 3 instruction steps", () => {
    const { getByText } = render(
      <WelcomeModal visible onDismiss={() => {}} />
    );
    expect(getByText("01")).toBeTruthy();
    expect(getByText("02")).toBeTruthy();
    expect(getByText("03")).toBeTruthy();
  });

  it("renders all 5 legend items", () => {
    const { getByText } = render(
      <WelcomeModal visible onDismiss={() => {}} />
    );
    expect(getByText("In Office")).toBeTruthy();
    expect(getByText("Public Holiday")).toBeTruthy();
    expect(getByText("Personal Leave")).toBeTruthy();
    expect(getByText("Sick Leave")).toBeTruthy();
    expect(getByText("Absent")).toBeTruthy();
  });

  it("calls onDismiss when Get Started pressed", () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <WelcomeModal visible onDismiss={onDismiss} />
    );
    fireEvent.press(getByText("Get Started"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <WelcomeModal visible={false} onDismiss={() => {}} />
    );
    expect(queryByText("InOffice")).toBeNull();
  });
});
