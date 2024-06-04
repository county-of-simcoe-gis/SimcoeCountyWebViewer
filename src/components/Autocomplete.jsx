import React, { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { get } from "../helpers/api";
import { getUID } from "../helpers/react";

// This key was created specifically for the demo in mui.com.
// You need to create a new one for your application.

const SCAutoComplete = (props) => {
  const [url, setUrl] = useState(null);
  const [value, setValue] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const handleChange = (e) => {
    setValue(e.target.value);
    if (props.onChange) props.onChange(e.target.value);
  };
  useEffect(() => {
    if (props.url) setUrl(props.url);
  }, [props.url]);

  useEffect(() => {
    if (inputValue === "") {
      setOptions(value ? [value] : []);
      return undefined;
    }
    setLoading(true);

    get(`${url}/${inputValue}`, { useBearerToken: true }, (results) => {
      // console.log(results);
      if (results)
        setOptions(
          results.map((item) => {
            return { value: item.id, description: item.COMPANY_NAME ? item.COMPANY_NAME : item.CONTACT_NAME };
          })
        );
      else setOptions([]);
      setLoading(false);
    });
  }, [value, inputValue]);

  return (
    <>
      <Autocomplete
        id={props.id}
        sx={{ width: 300 }}
        filterOptions={(x) => x}
        autoComplete
        includeInputInList
        filterSelectedOptions
        disableClearable
        freeSolo
        loading={loading}
        value={value}
        options={options}
        onChange={handleChange}
        onInputChange={(event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        getOptionLabel={(option) => (typeof option === "string" ? option : option.description)}
        renderOption={(props, option) => {
          return <div key={getUID()}>{option.description}</div>;
        }}
        renderInput={(params) => (
          <TextField
            key={`${props.id}-${params.value}`}
            {...params}
            variant="outlined"
            onChange={(e) => {
              setValue(e.target.value);
            }}
            label={props.label}
            placeholder="Type to search..."
            InputProps={{
              ...params.InputProps,
              type: "search",
            }}
          />
        )}
      />
    </>
  );
};
export default SCAutoComplete;
