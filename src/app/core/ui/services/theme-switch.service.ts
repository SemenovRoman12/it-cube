import { Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

type ThemeTransitionOptions = {
  x: number;
  y: number;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

@Injectable({
  providedIn: 'root',
})
export class ThemeSwitchService {
  private readonly storageKey = 'it-cube.theme';
  private readonly transitionDurationMs = 520;

  public readonly currentTheme = signal<AppTheme>('light');

  public init(): void {
    const storedTheme = localStorage.getItem(this.storageKey);
    const nextTheme: AppTheme = storedTheme === 'dark' ? 'dark' : 'light';

    this.setTheme(nextTheme);
  }

  public toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'dark' ? 'light' : 'dark');
  }

  public toggleThemeWithTransition(options: ThemeTransitionOptions): void {
    const nextTheme: AppTheme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      this.setTheme(nextTheme);
      return;
    }

    const root = document.documentElement;
    const maxRadius = Math.hypot(
      Math.max(options.x, window.innerWidth - options.x),
      Math.max(options.y, window.innerHeight - options.y)
    );

    const oldBackgroundColor = getComputedStyle(root).getPropertyValue('--sys-background').trim();

    root.style.setProperty('--theme-transition-x', `${options.x}px`);
    root.style.setProperty('--theme-transition-y', `${options.y}px`);
    root.style.setProperty('--theme-transition-max-radius', `${maxRadius}px`);
    root.style.setProperty('--theme-transition-duration', `${this.transitionDurationMs}ms`);
    root.style.setProperty('--theme-transition-old-bg', oldBackgroundColor || 'rgb(249 249 255)');

    const cleanup = (): void => {
      root.style.removeProperty('--theme-transition-x');
      root.style.removeProperty('--theme-transition-y');
      root.style.removeProperty('--theme-transition-max-radius');
      root.style.removeProperty('--theme-transition-duration');
      root.style.removeProperty('--theme-transition-old-bg');
      root.classList.remove('theme-fallback-transition-active');
    };

    const doc = document as ViewTransitionDocument;

    if (typeof doc.startViewTransition === 'function') {
      const transition = doc.startViewTransition(() => {
        this.setTheme(nextTheme);
      });

      transition.finished.finally(cleanup);
      return;
    }

    root.classList.add('theme-fallback-transition-active');
    this.setTheme(nextTheme);
    window.setTimeout(cleanup, this.transitionDurationMs + 80);
  }

  public setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.storageKey, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}
