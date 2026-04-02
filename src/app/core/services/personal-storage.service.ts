import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, from, map, Observable, of, switchMap, throwError } from 'rxjs';
import { ApiService } from '../http/api.service';
import { PersonalFileCreate, PersonalFileEntity } from '../models/personal-file.model';
import { FileStorageService } from './file-storage.service';

@Injectable({
  providedIn: 'root',
})
export class PersonalStorageService {
  private readonly api = inject(ApiService);
  private readonly fileStorage = inject(FileStorageService);

  public getUserFiles(userId: number): Observable<PersonalFileEntity[]> {
    return this.api.get<PersonalFileEntity[]>(`personal_files?user_id=${userId}`).pipe(
      catchError(() => of([])),
      map((files) => [...files].sort((first, second) => second.created_at.localeCompare(first.created_at))),
    );
  }

  public getUserUsedBytes(userId: number): Observable<number> {
    return this.getUserFiles(userId).pipe(
      map((files) => files.reduce((total, file) => total + file.size_bytes, 0)),
    );
  }

  public uploadUserFiles(userId: number, files: File[]): Observable<PersonalFileEntity[]> {
    if (!files.length) {
      return of([]);
    }

    return this.getUserUsedBytes(userId).pipe(
      switchMap((usedBytes) => {
        const newFilesSize = files.reduce((total, file) => total + file.size, 0);

        if (usedBytes + newFilesSize > this.fileStorage.personalStorageLimitBytes) {
          return throwError(() => new Error('PERSONAL_STORAGE.ERROR_LIMIT_EXCEEDED'));
        }

        return forkJoin(
          files.map((file) =>
            from(this.fileStorage.uploadPersonalFile(userId, file)).pipe(
              switchMap((stored) => this.api.post<PersonalFileCreate, PersonalFileEntity>('personal_files', {
                user_id: userId,
                file_name: stored.fileName,
                file_url: stored.fileUrl,
                storage_path: stored.storagePath,
                mime_type: stored.mimeType,
                size_bytes: stored.sizeBytes,
                created_at: new Date().toISOString(),
              })),
            ),
          ),
        );
      }),
    );
  }

  public deleteUserFile(file: PersonalFileEntity): Observable<void> {
    return from(this.fileStorage.removeFile(file.storage_path)).pipe(
      switchMap(() => this.api.delete<void>(`personal_files/${file.id}`, undefined as void)),
    );
  }
}

