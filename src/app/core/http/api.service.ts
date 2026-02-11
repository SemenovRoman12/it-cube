import { Injectable } from '@angular/core';
import {inject} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {API_URL} from './api-url.token';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  public get<T>(url: string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}/${url}`, {
      headers: this.headers
    });
  }

  public post<T, D>(url: string, data: T): Observable<D> {
    return this.http.post<D>(
      `${this.apiUrl}/${url}`, JSON.stringify(data), {
        headers: this.headers
      });
  }

  public put<T>(url: string, data: T): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${url}`, JSON.stringify(data), {
      headers: this.headers
    });
  }

  public delete<T>(url: string, data: T): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}/${url}`, {
      headers: this.headers
    });
  }

  private readonly headers = new HttpHeaders(
    {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  );
}
