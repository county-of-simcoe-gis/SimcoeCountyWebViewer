import { render, screen } from "@testing-library/react";
import LogoImage from "@/components/shared/LogoImage";
import { LOGO_MAX_HEIGHT_PX, LOGO_MAX_WIDTH_PX, LOGO_MIN_HEIGHT_PX, LOGO_MIN_WIDTH_PX } from "@/utils/logoUtils";

describe("LogoImage", () => {
  it("renders the default logo when no logo name is provided", () => {
    render(<LogoImage alt="Default logo" />);
    const img = screen.getByAltText("Default logo");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/logo.png");
  });

  it("renders a configured logo filename under /images/", () => {
    render(<LogoImage headerLogoImageName="logo.svg" alt="SVG logo" />);
    const img = screen.getByAltText("SVG logo");
    expect(img).toHaveAttribute("src", "/images/logo.svg");
  });

  it("uses absolute paths as-is", () => {
    render(<LogoImage headerLogoImageName="/custom/logo.svg" alt="Absolute logo" />);
    const img = screen.getByAltText("Absolute logo");
    expect(img).toHaveAttribute("src", "/custom/logo.svg");
  });

  it("applies the default min/max sizing classes", () => {
    render(<LogoImage headerLogoImageName="logo.svg" alt="Sized logo" />);
    const container = screen.getByAltText("Sized logo").parentElement;
    expect(container).toHaveClass(`min-w-[${LOGO_MIN_WIDTH_PX}px]`);
    expect(container).toHaveClass(`min-h-[${LOGO_MIN_HEIGHT_PX}px]`);
    expect(container).toHaveClass(`max-w-[${LOGO_MAX_WIDTH_PX}px]`);
    expect(container).toHaveClass(`max-h-[${LOGO_MAX_HEIGHT_PX}px]`);
  });

  it("applies custom container and image classes", () => {
    render(<LogoImage headerLogoImageName="logo.svg" alt="Styled logo" containerClassName="my-container" className="my-image" />);
    const img = screen.getByAltText("Styled logo");
    expect(img).toHaveClass("my-image");
    expect(img.parentElement).toHaveClass("my-container");
  });

  it("does not add conflicting fill utilities when an explicit image className is provided", () => {
    render(<LogoImage headerLogoImageName="logo.svg" alt="Conflicting logo" className="max-h-[50px] max-w-[200px]" />);
    const img = screen.getByAltText("Conflicting logo");
    expect(img).toHaveClass("max-h-[50px]");
    expect(img).toHaveClass("max-w-[200px]");
    expect(img).not.toHaveClass("max-h-full");
    expect(img).not.toHaveClass("max-w-full");
    expect(img).toHaveClass("object-contain");
  });

  it("applies default fill utilities when no image className is provided", () => {
    render(<LogoImage headerLogoImageName="logo.svg" alt="Default fill logo" />);
    const img = screen.getByAltText("Default fill logo");
    expect(img).toHaveClass("max-h-full");
    expect(img).toHaveClass("max-w-full");
    expect(img).toHaveClass("object-contain");
  });
});
