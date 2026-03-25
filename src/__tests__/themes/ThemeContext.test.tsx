import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider, useTheme } from '@/themes/theme.context';

// Consumer component that exposes the context values
function ThemeConsumer() {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('custom', { primary: '#000', background: '#fff', surface: '#fff', text: '#000', border: '#ccc' })}>
        Set Custom
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to light theme when localStorage is empty', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('loads saved theme from localStorage', () => {
    localStorage.setItem('app-theme', 'dark');
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('toggleTheme switches light → dark', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('toggleTheme switches dark → light', () => {
    localStorage.setItem('app-theme', 'dark');
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('setTheme("dark") adds "dark" class to html element', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Set Dark' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('setTheme("light") removes "dark" class from html element', () => {
    document.documentElement.classList.add('dark');
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Set Light' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('setTheme("custom") applies CSS custom properties to :root', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Set Custom' }));
    expect(screen.getByTestId('theme').textContent).toBe('custom');
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#000');
  });

  it('persists theme choice to localStorage', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Set Dark' }));
    expect(localStorage.getItem('app-theme')).toBe('dark');
  });
});

describe('useTheme outside provider', () => {
  it('throws an error', () => {
    const originalConsoleError = console.error;
    console.error = vi.fn(); // suppress React's boundary error output
    function BadConsumer() {
      useTheme();
      return null;
    }
    expect(() =>
      render(
        <BadConsumer />,
      ),
    ).toThrow('useTheme must be used within a <ThemeProvider>');
    console.error = originalConsoleError;
  });
});
