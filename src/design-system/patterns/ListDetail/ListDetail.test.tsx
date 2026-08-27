import "@testing-library/jest-dom/vitest";

import { createRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ListDetail } from "./ListDetail";

const FocusHarness = () => {
  const [view, setView] = useState<"list" | "detail">("list");
  const selectedRef = createRef<HTMLButtonElement>();

  return (
    <ListDetail
      detail={<p>Selected content</p>}
      detailHeading="Selected problem"
      detailLabel="Problem detail"
      list={(
        <button ref={selectedRef} type="button" onClick={() => setView("detail")}>
          Open expected value
        </button>
      )}
      listLabel="Problems"
      mobileView={view}
      onBack={() => setView("list")}
      returnFocusRef={selectedRef}
    />
  );
};

describe("ListDetail", () => {
  it("moves focus into mobile detail and restores it to the selected list item", async () => {
    const user = userEvent.setup();
    render(<FocusHarness />);

    const selected = screen.getByRole("button", { name: "Open expected value" });
    await user.click(selected);
    expect(screen.getByRole("region", { name: "Selected problem" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Back to list" }));
    expect(selected).toHaveFocus();
  });

  it("renders an explicit, labelled empty detail state", () => {
    render(
      <ListDetail
        detail={null}
        detailLabel="Selection"
        emptyDetail="Choose a problem"
        list={<p>Problem list</p>}
        listLabel="Problems"
        onBack={() => undefined}
      />,
    );

    expect(screen.getByRole("region", { name: "Selection" })).toHaveTextContent("Choose a problem");
  });
});
