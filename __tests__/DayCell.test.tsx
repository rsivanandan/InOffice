import { render } from "@testing-library/react-native";
import DayCell from "../src/components/DayCell";

describe("DayCell", () => {
  it("renders empty view when day is 0", () => {
    const { toJSON } = render(
      <DayCell
        day={0}
        isCurrentMonth
        isToday={false}
        status="absent"
        onPress={() => {}}
        onLongPress={() => {}}
      />
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it("renders day number", () => {
    const { getByText } = render(
      <DayCell
        day={15}
        isCurrentMonth
        isToday={false}
        status="absent"
        onPress={() => {}}
        onLongPress={() => {}}
      />
    );
    expect(getByText("15")).toBeTruthy();
  });

  it("shows H label for public-holiday", () => {
    const { getByText } = render(
      <DayCell
        day={1}
        isCurrentMonth
        isToday={false}
        status="public-holiday"
        onPress={() => {}}
        onLongPress={() => {}}
      />
    );
    expect(getByText("H")).toBeTruthy();
  });

  it("shows L label for personal-leave", () => {
    const { getByText } = render(
      <DayCell
        day={1}
        isCurrentMonth
        isToday={false}
        status="personal-leave"
        onPress={() => {}}
        onLongPress={() => {}}
      />
    );
    expect(getByText("L")).toBeTruthy();
  });

  it("shows S label for sick-leave", () => {
    const { getByText } = render(
      <DayCell
        day={1}
        isCurrentMonth
        isToday={false}
        status="sick-leave"
        onPress={() => {}}
        onLongPress={() => {}}
      />
    );
    expect(getByText("S")).toBeTruthy();
  });

  it("shows no label for in-office", () => {
    const { queryByText } = render(
      <DayCell
        day={1}
        isCurrentMonth
        isToday={false}
        status="in-office"
        onPress={() => {}}
        onLongPress={() => {}}
      />
    );
    expect(queryByText("H")).toBeNull();
    expect(queryByText("L")).toBeNull();
    expect(queryByText("S")).toBeNull();
  });

  it("shows green tile for in-office", () => {
    const { toJSON } = render(
      <DayCell
        day={1}
        isCurrentMonth
        isToday={false}
        status="in-office"
        onPress={() => {}}
        onLongPress={() => {}}
      />
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it("applies today styling", () => {
    const { toJSON } = render(
      <DayCell
        day={1}
        isCurrentMonth
        isToday
        status="absent"
        onPress={() => {}}
        onLongPress={() => {}}
      />
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it("dims non-current month days", () => {
    const { toJSON } = render(
      <DayCell
        day={15}
        isCurrentMonth={false}
        isToday={false}
        status="absent"
        onPress={() => {}}
        onLongPress={() => {}}
      />
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
