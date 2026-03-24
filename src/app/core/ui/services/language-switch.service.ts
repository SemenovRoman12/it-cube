import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'ru' | 'en';

@Injectable({
  providedIn: 'root',
})
export class LanguageSwitchService {
  private readonly storageKey = 'it-cube.language';
  private readonly fallbackLanguage: AppLanguage = 'ru';

  public readonly currentLanguage = signal<AppLanguage>(this.fallbackLanguage);

  constructor(private readonly translateService: TranslateService) {}

  public init(): void {
    const storedLanguage = localStorage.getItem(this.storageKey);
    const browserLanguage = navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
    const nextLanguage = this.isSupportedLanguage(storedLanguage) ? storedLanguage : browserLanguage;

    this.setLanguage(nextLanguage);
  }

  public toggleLanguage(): void {
    this.setLanguage(this.currentLanguage() === 'ru' ? 'en' : 'ru');
  }

  public setLanguage(language: AppLanguage): void {
    this.translateService.use(language);
    this.currentLanguage.set(language);
    localStorage.setItem(this.storageKey, language);
    document.documentElement.lang = language;
  }

  private isSupportedLanguage(language: string | null): language is AppLanguage {
    return language === 'ru' || language === 'en';
  }
}
