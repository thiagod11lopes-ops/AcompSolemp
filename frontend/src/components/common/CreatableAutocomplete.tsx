import { Autocomplete, TextField } from '@mui/material'

interface CreatableAutocompleteProps {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  error?: boolean
  helperText?: string
  placeholder?: string
}

export function CreatableAutocomplete({
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  placeholder,
}: CreatableAutocompleteProps) {
  return (
    <Autocomplete
      freeSolo
      options={options}
      value={value}
      onChange={(_, newValue) => onChange(newValue ?? '')}
      onInputChange={(_, newValue) => onChange(newValue)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
        />
      )}
    />
  )
}
