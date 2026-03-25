import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import InputElement from '@/components/form/input/FormInputControl';

// ---------------------------------------------------------------------------
// Wrapper that provides a real react-hook-form register function
// ---------------------------------------------------------------------------

type WrapperProps = {
  type?: string;
  label?: string;
  error?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  accept?: string;
};

function Wrapper({ type = 'text', label = 'Field', error, ...rest }: WrapperProps) {
  const { register } = useForm<{ field: string }>();
  return (
    <InputElement
      name="field"
      label={label}
      type={type as never}
      register={register}
      error={error}
      {...rest}
    />
  );
}

describe('InputElement', () => {
  describe('text input (default)', () => {
    it('renders a label and input', () => {
      render(<Wrapper label="Username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('renders a placeholder', () => {
      render(<Wrapper placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('shows error message when error prop is set', () => {
      render(<Wrapper error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('sets aria-invalid="true" when there is an error', () => {
      render(<Wrapper error="Required" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('sets aria-invalid="false" when there is no error', () => {
      render(<Wrapper />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
    });
  });

  describe('textarea', () => {
    it('renders a textarea element', () => {
      render(<Wrapper type="textarea" label="Description" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      // Verify it's actually a textarea via tag
      expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
    });

    it('applies rows attribute', () => {
      render(<Wrapper type="textarea" rows={5} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
    });
  });

  describe('select', () => {
    const options = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ];

    it('renders a select element', () => {
      render(<Wrapper type="select" label="Category" options={options} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders provided options plus a default placeholder', () => {
      render(<Wrapper type="select" options={options} />);
      expect(screen.getByRole('option', { name: '-- Select --' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Option A' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Option B' })).toBeInTheDocument();
    });
  });

  describe('checkbox', () => {
    it('renders a checkbox input', () => {
      render(<Wrapper type="checkbox" label="Accept terms" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('shows the label text', () => {
      render(<Wrapper type="checkbox" label="Accept terms" />);
      expect(screen.getByText('Accept terms')).toBeInTheDocument();
    });
  });

  describe('radio', () => {
    const options = [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ];

    it('renders radio inputs for each option', () => {
      render(<Wrapper type="radio" label="Agree?" options={options} />);
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
    });
  });

  describe('file', () => {
    it('renders a file input', () => {
      render(<Wrapper type="file" label="Upload" accept="image/*" />);
      // file inputs don't get a role by default, query by label
      const input = screen.getByLabelText('Upload') as HTMLInputElement;
      expect(input.type).toBe('file');
    });

    it('applies the accept attribute', () => {
      render(<Wrapper type="file" label="Upload" accept="image/*" />);
      expect(screen.getByLabelText('Upload')).toHaveAttribute('accept', 'image/*');
    });
  });
});
