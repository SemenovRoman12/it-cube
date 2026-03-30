import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { interval, Observable, Subject, Subscription, catchError, forkJoin, map, of, startWith, switchMap, takeUntil, tap } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { ApiService } from '../http/api.service';
import { NotificationCreate, NotificationEntity } from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly destroyPolling$ = new Subject<void>();
  private pollingSubscription: Subscription | null = null;

  private readonly _notifications = signal<NotificationEntity[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _unreadCount = signal(0);

  public readonly notifications = this._notifications.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly unreadCount = computed(() => this._unreadCount());

  public startPolling(intervalMs = 30000): void {
    this.stopPolling();

    if (!this.canLoadNotifications()) {
      return;
    }

    this.loadUnreadCount().subscribe();

    this.pollingSubscription = interval(intervalMs)
      .pipe(
        startWith(0),
        takeUntil(this.destroyPolling$),
        switchMap(() => this.loadUnreadCount()),
      )
      .subscribe();
  }

  public stopPolling(): void {
    this.destroyPolling$.next();
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = null;
  }

  public resetState(): void {
    this.stopPolling();
    this._notifications.set([]);
    this._unreadCount.set(0);
    this._isLoading.set(false);
  }

  public getNotificationsForCurrentUser(): Observable<NotificationEntity[]> {
    const currentUser = this.authService.user();

    if (!currentUser) {
      this._notifications.set([]);
      return of([]);
    }

    this._isLoading.set(true);

    return this.api
      .get<NotificationEntity[]>(`notifications?user_id=${currentUser.id}`)
      .pipe(
        map((items) => this.sortNotifications(items)),
        tap((items) => this._notifications.set(items)),
        tap((items) => this._unreadCount.set(items.filter((item) => !item.is_read).length)),
        tap(() => this._isLoading.set(false)),
        catchError(() => {
          this._notifications.set([]);
          this._isLoading.set(false);
          return of([]);
        }),
      );
  }

  public loadUnreadCount(): Observable<number> {
    const currentUser = this.authService.user();

    if (!currentUser) {
      this._unreadCount.set(0);
      return of(0);
    }

    return this.api.get<NotificationEntity[]>(`notifications?user_id=${currentUser.id}&is_read=false`).pipe(
      map((items) => items.length),
      tap((count) => this._unreadCount.set(count)),
      catchError(() => {
        this._unreadCount.set(0);
        return of(0);
      }),
    );
  }

  public markAsRead(notificationId: number): Observable<NotificationEntity> {
    return this.api.patch<NotificationEntity>(`notifications/${notificationId}`, {
      is_read: true,
      read_at: new Date().toISOString(),
    }).pipe(
      tap((updated) => {
        this._notifications.update((items) =>
          items.map((item) => item.id === notificationId ? updated : item),
        );
        this._unreadCount.update((count) => Math.max(0, count - 1));
      }),
      tap(() => {
        this._notifications.update((items) => this.sortNotifications(items));
      }),
    );
  }

  public openNotification(notification: NotificationEntity): Observable<NotificationEntity> {
    const action$ = notification.is_read ? of(notification) : this.markAsRead(notification.id);

    return action$.pipe(
      tap((updatedNotification) => {
        if (updatedNotification.link) {
          this.router.navigateByUrl(updatedNotification.link);
        }
      }),
    );
  }

  public createMarkNotification(payload: NotificationCreate): Observable<NotificationEntity> {
    return this.api.post<NotificationCreate, NotificationEntity>('notifications', payload);
  }

  public refreshForCurrentUser(): Observable<{ notifications: NotificationEntity[]; unreadCount: number }> {
    return forkJoin({
      notifications: this.getNotificationsForCurrentUser(),
      unreadCount: this.loadUnreadCount(),
    });
  }

  private canLoadNotifications(): boolean {
    return !!this.authService.user();
  }

  private sortNotifications(items: NotificationEntity[]): NotificationEntity[] {
    return [...items].sort((first, second) => second.created_at.localeCompare(first.created_at));
  }
}
