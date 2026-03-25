import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import InputElement from './FormInputControl';

// Wrapper to provide react-hook-form context
function WithForm({ children }: { children: (register: ReturnType<typeof useForm>['register']) => React.ReactNode }) {
  const { register } = useForm();
  return <>{children(register)}</>;
}

const meta = {
  title: 'Form/InputElement',
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextInput: Story = {
  render: () => (
    <WithForm>
      {(register) => (
        <InputElement name="username" label="Username" placeholder="JohnDoe" register={register} />
      )}
    </WithForm>
  ),
};

export const EmailInput: Story = {
  render: () => (
    <WithForm>
      {(register) => (
        <InputElement name="email" label="Email" type="email" placeholder="name@example.com" register={register} />
      )}
    </WithForm>
  ),
};

export const PasswordInput: Story = {
  render: () => (
    <WithForm>
      {(register) => (
        <InputElement name="password" label="Password" type="password" register={register} />
      )}
    </WithForm>
  ),
};

export const WithError: Story = {
  render: () => (
    <WithForm>
      {(register) => (
        <InputElement name="email" label="Email" type="email" register={register} error="This field is required" />
      )}
    </WithForm>
  ),
};

export const TextareaInput: Story = {
  render: () => (
    <WithForm>
      {(register) => (
        <InputElement name="bio" label="Bio" type="textarea" placeholder="Tell us about yourself" register={register} rows={4} />
      )}
    </WithForm>
  ),
};

export const SelectInput: Story = {
  render: () => (
    <WithForm>
      {(register) => (
        <InputElement
          name="country"
          label="Country"
          type="select"
          register={register}
          options={[
            { label: 'Egypt', value: 'eg' },
            { label: 'USA', value: 'us' },
            { label: 'Germany', value: 'de' },
          ]}
        />
      )}
    </WithForm>
  ),
};

export const RadioInput: Story = {
  render: () => (
    <WithForm>
      {(register) => (
        <InputElement
          name="gender"
          label="Gender"
          type="radio"
          register={register}
          options={[
            { label: 'Male', value: 'male' },
            { label: 'Female', value: 'female' },
          ]}
        />
      )}
    </WithForm>
  ),
};
