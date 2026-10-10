import React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { normalizeTags } from "./playlistTags";

type TagInputProps = {
  value: string[];
  options: string[];
  onChange: (tags: string[]) => void;
  label: string;
  helperText: string;
};

export function TagInput({
  value,
  options,
  onChange,
  label,
  helperText,
}: TagInputProps) {
  return (
    <Autocomplete
      multiple
      freeSolo
      autoSelect
      filterSelectedOptions
      options={options}
      value={value}
      getOptionLabel={(tag) => `#${tag}`}
      onChange={(_, tags) => onChange(normalizeTags(tags))}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText={helperText}
          margin="dense"
          fullWidth
        />
      )}
    />
  );
}
