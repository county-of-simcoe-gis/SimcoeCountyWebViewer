import { render, screen } from "@testing-library/react";
import LoadingScreen from "@/components/LoadingScreen";

describe("LoadingScreen", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(<LoadingScreen visible={false} splashLogoImageName="splash.png" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the splash logo when splashLogoImageName is provided", () => {
    render(<LoadingScreen visible splashLogoImageName="splash.png" />);
    expect(screen.getByAltText("Logo Image")).toHaveAttribute("src", "/images/splash.png");
  });

  it("renders only the OpenGIS logo when no splash logo is provided", () => {
    render(<LoadingScreen visible />);
    expect(screen.queryByAltText("Logo Image")).not.toBeInTheDocument();
    expect(screen.getByAltText("OpenGIS")).toBeInTheDocument();
  });
});
