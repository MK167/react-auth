import type { FieldValues } from "react-hook-form";
import type { Props } from "./index.type";

/**
 * 
 * @param param
 * @param name - The name of the form field, which is used to register the input with `react-hook-form` and to associate the label and error messages with the correct input element.
 * @param label - The text label that describes the input field, providing context to the user about what information is expected.
 * @param type - The type of input element to render (e.g., "text", "email", "password", "checkbox", "select", "radio", "textarea", "file"). This determines the HTML element used and its behavior.
 * @param register - The `register` function from `react-hook-form` that connects the input field to the form state management, allowing for validation and value tracking.
 * @param error - An optional string that contains the error message to display if the input field has a validation error. If this prop is provided, it will be shown below the input field.
 * @param placeholder - An optional string that provides a hint to the user about what to enter in the input field. It is displayed inside the input when it is empty.
 * @param autoComplete - An optional string that specifies whether the browser should enable autocomplete for the input field, and if so, what type of data it should suggest (e.g., "email", "current-password").
 * @param options - An optional array of options used for select, radio, or checkbox inputs. Each option should have a `value` and a `label`.
 * @param rows - An optional number that specifies the number of visible text lines for a textarea input. It is ignored for other input types.
 * @param accept - An optional string that specifies the types of files that the file input should accept (e.g., "image/*" for all image types).
 *  
 * @returns A TSX element representing the input field, configured according to the provided props. The component handles various input types and displays error messages when validation fails, ensuring a consistent and accessible user experience across different form fields.
 * @throws Will render an input field based on the specified type and display an error message if the `error` prop is provided. The component does not throw exceptions but relies on conditional rendering to handle different input types and error states.
 */
const InputElement = <TFieldValues extends FieldValues>({
  name,
  label,
  type = "text",
  register,
  error,
  placeholder,
  autoComplete,
  options = [],
  rows = 3,
  accept,
}: Props<TFieldValues>) => {
  const inputId = `field-${name}`;
  const errorId = `error-${name}`;

  const baseStyle =
    "w-full border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-black transition";

  const borderStyle = error ? "border-red-400" : "border-gray-300";

  /* ================= FILE ================= */
  if (type === "file") {
    return (
      <div className="mb-4">
        <label htmlFor={inputId} className="block mb-1 text-sm font-medium">
          {label}
        </label>

        <input
          id={inputId}
          type="file"
          accept={accept}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          {...register(name)}
          className={`${baseStyle} ${borderStyle}`}
        />

        {error && (
          <p id={errorId} className="text-red-500 text-xs mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }

  /* ================= CHECKBOX ================= */
  if (type === "checkbox") {
    return (
      <div className="mb-4">
        <label htmlFor={inputId} className="flex items-center gap-2 text-sm">
          <input
            id={inputId}
            type="checkbox"
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? errorId : undefined}
            {...register(name)}
            className="w-4 h-4"
          />
          {label}
        </label>

        {error && (
          <p id={errorId} className="text-red-500 text-xs mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }

  /* ================= SELECT ================= */
  if (type === "select") {
    return (
      <div className="mb-4">
        <label htmlFor={inputId} className="block mb-1 text-sm font-medium">
          {label}
        </label>

        <select
          id={inputId}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          {...register(name)}
          className={`${baseStyle} ${borderStyle}`}
        >
          <option value="">-- Select --</option>

          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {error && (
          <p id={errorId} className="text-red-500 text-xs mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }

  /* ================= RADIO ================= */
  if (type === "radio") {
    return (
      <div className="mb-4">
        <p className="text-sm font-medium mb-1">{label}</p>

        <div className="flex gap-4">
          {options.map((opt) => (
            <label key={opt.value} className="flex gap-2 text-sm">
              <input
                type="radio"
                value={opt.value}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? errorId : undefined}
                {...register(name)}
              />
              {opt.label}
            </label>
          ))}
        </div>

        {error && (
          <p id={errorId} className="text-red-500 text-xs mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }

  /* ================= TEXTAREA ================= */
  if (type === "textarea") {
    return (
      <div className="mb-4">
        <label htmlFor={inputId} className="block mb-1 text-sm font-medium">
          {label}
        </label>

        <textarea
          id={inputId}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          {...register(name)}
          className={`${baseStyle} ${borderStyle}`}
        />

        {error && (
          <p id={errorId} className="text-red-500 text-xs mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }

  /* ================= DEFAULT INPUT ================= */
  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block mb-1 text-sm font-medium">
        {label}
      </label>

      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        {...register(name)}
        className={`${baseStyle} ${borderStyle}`}
      />

      {error && (
        <p id={errorId} className="text-red-500 text-xs mt-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default InputElement;
