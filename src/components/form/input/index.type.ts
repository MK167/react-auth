import type { FieldValues, Path, UseFormRegister } from "react-hook-form";

export type Option = {
  value: string;
  label: string;
};

export type Props<TFieldValues extends FieldValues> = {
  name: Path<TFieldValues>;
  label: string;
  type?: string;
  register: UseFormRegister<TFieldValues>;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  options?: Option[];
  rows?: number;
  accept?: string;
};