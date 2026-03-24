import { Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeSwitchService {
  private readonly storageKey = 'it-cube.theme';

  public readonly currentTheme = signal<AppTheme>('light');

  public init(): void {
    const storedTheme = localStorage.getItem(this.storageKey);
    const nextTheme: AppTheme = storedTheme === 'dark' ? 'dark' : 'light';

    this.setTheme(nextTheme);
  }

  public toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'dark' ? 'light' : 'dark');
  }

  public setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.storageKey, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}
