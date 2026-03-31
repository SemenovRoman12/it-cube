import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subscription, catchError, forkJoin, map, of, startWith, switchMap, tap, timer } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { API_URL } from '../http/api-url.token';
import { ApiService } from '../http/api.service';
import { NotificationCreate, NotificationEntity } from '../models/notification.model';

const NOTIFICATIONS_PAGE_SIZE = 4;

interface MokkyPageMeta {
  total_items: number;
  total_pages: number;
  current_page: number;
  per_page: number;
  remaining_count: number;
}

interface MokkyPageResponse<T> {
  meta: MokkyPageMeta;
  items: T[];
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private pollingSubscription: Subscription | null = null;

  private readonly _notifications = signal<NotificationEntity[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _isLoadingMore = signal(false);
  private readonly _unreadCount = signal(0);
  private readonly _currentPage = signal(0);
  private readonly _hasMore = signal(true);

  public readonly notifications = this._notifications.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly isLoadingMore = this._isLoadingMore.asReadonly();
  public readonly unreadCount = computed(() => this._unreadCount());
  public readonly hasMore = this._hasMore.asReadonly();

  public startPolling(intervalMs = 30000): void {
    this.stopPolling();

    if (!this.getCurrentUserId()) {
      return;
    }

    this.pollingSubscription = timer(0, intervalMs)
      .pipe(
        switchMap(() => this.loadUnreadCount()),
      )
      .subscribe();
  }

  public stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = null;
  }

  public resetState(): void {
    this.stopPolling();
    this._notifications.set([]);
    this._unreadCount.set(0);
    this._isLoading.set(false);
    this._isLoadingMore.set(false);
    this._currentPage.set(0);
    this._hasMore.set(true);
  }

  public loadFirstPage(): Observable<NotificationEntity[]> {
    const currentUserId = this.getCurrentUserId();

    if (!currentUserId) {
      this.setNotificationsState([]);
      this._currentPage.set(0);
      this._hasMore.set(false);
      return of([]);
    }

    if (this._isLoading()) {
      return of(this._notifications());
    }

    this._isLoading.set(true);
    this._currentPage.set(0);
    this._hasMore.set(true);

    return this.fetchNotificationsPage(currentUserId, 1)
      .pipe(
        tap((items) => {
          this.setNotificationsState(items);
          this._currentPage.set(items.length ? 1 : 0);
          this._hasMore.set(items.length === NOTIFICATIONS_PAGE_SIZE);
        }),
        tap(() => this._isLoading.set(false)),
        catchError(() => {
          this.setNotificationsState([]);
          this._isLoading.set(false);
          this._currentPage.set(0);
          this._hasMore.set(false);
          return of([]);
        }),
      );
  }

  public loadNextPage(): Observable<NotificationEntity[]> {
    const currentUserId = this.getCurrentUserId();

    if (!currentUserId || this._isLoading() || this._isLoadingMore() || !this._hasMore()) {
      return of(this._notifications());
    }

    const nextPage = this._currentPage() + 1;

    this._isLoadingMore.set(true);

    return this.fetchNotificationsPage(currentUserId, nextPage).pipe(
      tap((items) => {
        const mergedItems = this.mergeNotifications(this._notifications(), items);

        this._notifications.set(mergedItems);
        this._currentPage.set(nextPage);
        this._hasMore.set(items.length === NOTIFICATIONS_PAGE_SIZE);
      }),
      tap(() => this._isLoadingMore.set(false)),
      catchError(() => {
        this._isLoadingMore.set(false);
        return of(this._notifications());
      }),
    );
  }

  public loadUnreadCount(): Observable<number> {
    const currentUserId = this.getCurrentUserId();

    if (!currentUserId) {
      this._unreadCount.set(0);
      return of(0);
    }

    return this.api.get<NotificationEntity[]>(`notifications?user_id=${currentUserId}&is_read=false`).pipe(
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

  public deleteNotification(notificationId: number): Observable<null> {
    return this.api.delete<null>(`notifications/${notificationId}`, null).pipe(
      tap(() => {
        const deletedNotification = this._notifications().find((item) => item.id === notificationId) ?? null;

        this._notifications.update((items) => items.filter((item) => item.id !== notificationId));

        if (deletedNotification && !deletedNotification.is_read) {
          this._unreadCount.update((count) => Math.max(0, count - 1));
        }
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
      notifications: this.loadFirstPage(),
      unreadCount: this.loadUnreadCount(),
    });
  }

  private getCurrentUserId(): number | null {
    return this.authService.user()?.id ?? null;
  }

  private setNotificationsState(items: NotificationEntity[]): void {
    this._notifications.set(items);
    this._unreadCount.set(items.filter((item) => !item.is_read).length);
  }

  private fetchNotificationsPage(currentUserId: number, page: number): Observable<NotificationEntity[]> {
    const params = new HttpParams()
      .set('user_id', currentUserId)
      .set('page', page)
      .set('limit', NOTIFICATIONS_PAGE_SIZE)
      .set('sortBy', '-created_at');

    return this.http
      .get<MokkyPageResponse<NotificationEntity>>(`${this.apiUrl}/notifications`, { params })
      .pipe(map((response) => this.sortNotifications(response.items ?? [])));
  }

  private mergeNotifications(currentItems: NotificationEntity[], nextItems: NotificationEntity[]): NotificationEntity[] {
    const uniqueItems = new Map<number, NotificationEntity>();

    for (const item of [...currentItems, ...nextItems]) {
      uniqueItems.set(item.id, item);
    }

    return this.sortNotifications(Array.from(uniqueItems.values()));
  }

  private sortNotifications(items: NotificationEntity[]): NotificationEntity[] {
    return [...items].sort((first, second) => second.created_at.localeCompare(first.created_at));
  }
}
