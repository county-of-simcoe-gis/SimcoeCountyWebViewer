import type { StylesConfig, CSSObjectWithLabel } from "react-select";

/**
 * React-select styles for Group dropdown
 */
export const avlGroupDropDownStyles: StylesConfig = {
  control: (provided: CSSObjectWithLabel) => ({
    ...provided,
    minHeight: "30px",
    width: "222px",
  }),
  indicatorsContainer: (provided: CSSObjectWithLabel) => ({
    ...provided,
    height: "25px",
  }),
  clearIndicator: (provided: CSSObjectWithLabel) => ({
    ...provided,
    padding: "5px",
  }),
  dropdownIndicator: (provided: CSSObjectWithLabel) => ({
    ...provided,
    padding: "5px",
  }),
  menuPortal: (provided: CSSObjectWithLabel) => ({
    ...provided,
    zIndex: 9999,
  }),
};

/**
 * React-select styles for Vehicle dropdown
 */
export const avlVehicleDropDownStyles: StylesConfig = {
  control: (provided: CSSObjectWithLabel) => ({
    ...provided,
    minHeight: "30px",
    width: "222px",
  }),
  indicatorsContainer: (provided: CSSObjectWithLabel) => ({
    ...provided,
    height: "25px",
  }),
  clearIndicator: (provided: CSSObjectWithLabel) => ({
    ...provided,
    padding: "5px",
  }),
  dropdownIndicator: (provided: CSSObjectWithLabel) => ({
    ...provided,
    padding: "5px",
  }),
  menuPortal: (provided: CSSObjectWithLabel) => ({
    ...provided,
    zIndex: 9999,
  }),
};

/**
 * React-select styles for Speed Operator dropdown
 */
export const avlSpeedOperatorDropDownStyles: StylesConfig = {
  control: (provided: CSSObjectWithLabel) => ({
    ...provided,
    minHeight: "30px",
    width: "75px",
  }),
  indicatorsContainer: (provided: CSSObjectWithLabel) => ({
    ...provided,
    height: "25px",
  }),
  clearIndicator: (provided: CSSObjectWithLabel) => ({
    ...provided,
    padding: "5px",
  }),
  dropdownIndicator: (provided: CSSObjectWithLabel) => ({
    ...provided,
    padding: "5px",
  }),
  menuPortal: (provided: CSSObjectWithLabel) => ({
    ...provided,
    zIndex: 9999,
  }),
};

/**
 * React-select styles for Speed dropdown
 */
export const avlSpeedDropDownStyles: StylesConfig = {
  control: (provided: CSSObjectWithLabel) => ({
    ...provided,
    minHeight: "30px",
    width: "75px",
    marginLeft: "5px",
  }),
  indicatorsContainer: (provided: CSSObjectWithLabel) => ({
    ...provided,
    height: "25px",
  }),
  clearIndicator: (provided: CSSObjectWithLabel) => ({
    ...provided,
    padding: "5px",
  }),
  dropdownIndicator: (provided: CSSObjectWithLabel) => ({
    ...provided,
    padding: "5px",
  }),
  menuPortal: (provided: CSSObjectWithLabel) => ({
    ...provided,
    zIndex: 9999,
  }),
};

/**
 * React-select styles for Live sort dropdown
 */
export const avlLiveDropDownStyles: StylesConfig = {
  control: (provided: CSSObjectWithLabel) => ({
    ...provided,
    minHeight: "30px",
    width: "130px",
  }),
  indicatorsContainer: (provided: CSSObjectWithLabel) => ({
    ...provided,
    height: "25px",
  }),
  clearIndicator: (provided: CSSObjectWithLabel) => ({
    ...provided,
    padding: "5px",
  }),
  dropdownIndicator: (provided: CSSObjectWithLabel) => ({
    ...provided,
    padding: "5px",
  }),
};

/**
 * Style used by history simplification slider
 */
export const avlHistorySliderWrapperStyle: React.CSSProperties = {
  width: 240,
};

/**
 * Marks for the simplification slider (0-10)
 */
export const avlHistoryMarks: Record<number, { style: React.CSSProperties; label: React.ReactNode }> = {
  0: { style: { fontSize: "7pt" }, label: "0" },
  1: { style: { fontSize: "7pt" }, label: "1" },
  2: { style: { fontSize: "7pt" }, label: "2" },
  3: { style: { fontSize: "7pt" }, label: "3" },
  4: { style: { fontSize: "7pt" }, label: "4" },
  5: { style: { fontSize: "7pt" }, label: "5" },
  6: { style: { fontSize: "7pt" }, label: "6" },
  7: { style: { fontSize: "7pt" }, label: "7" },
  8: { style: { fontSize: "7pt" }, label: "8" },
  9: { style: { fontSize: "7pt" }, label: "9" },
  10: { style: { fontSize: "7pt" }, label: "10" },
};
