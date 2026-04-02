import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.development';

export interface StoredFileUpload {
  fileName: string;
  fileUrl: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}

@Injectable({
  providedIn: 'root',
})
export class FileStorageService {
  private readonly bucket = environment.supabaseBucket;
  private readonly maxFileSizeBytes = 50 * 1024 * 1024;
  private readonly allowedExtensions = new Set([
    'pdf',
    'png',
    'jpg',
    'jpeg',
    'webp',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'txt',
    'csv',
    'json',
    'html',
    'css',
    'js',
    'ts',
    'py',
    'java',
    'c',
    'cpp',
    'cs',
    'xml',
    'zip',
    'rar',
    '7z',
  ]);

  private readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabasePublishableKey);

  public validateFile(file: File): string | null {
    const extension = this.getFileExtension(file.name);

    if (!extension || !this.allowedExtensions.has(extension)) {
      return 'Недопустимый формат файла.';
    }

    if (file.size > this.maxFileSizeBytes) {
      return 'Размер файла превышает 50 МБ.';
    }

    return null;
  }

  public validateFiles(files: File[]): string | null {
    return files.map((file) => this.validateFile(file)).find((message) => !!message) ?? null;
  }

  public async uploadAssignmentFile(lessonId: number, file: File): Promise<StoredFileUpload> {
    return this.uploadFile(`assignments/${lessonId}`, file);
  }

  public async uploadSubmissionFile(submissionId: number, file: File): Promise<StoredFileUpload> {
    return this.uploadFile(`submissions/${submissionId}`, file);
  }

  public async removeFile(storagePath: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([storagePath]);

    if (error) {
      throw error;
    }
  }

  private async uploadFile(folder: string, file: File): Promise<StoredFileUpload> {
    const validationError = this.validateFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const safeName = this.buildSafeFileName(file.name);
    const storagePath = `${folder}/${Date.now()}_${safeName}`;
    const { error } = await this.client.storage.from(this.bucket).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) {
      throw error;
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(storagePath);

    return {
      fileName: file.name,
      fileUrl: data.publicUrl,
      storagePath,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    };
  }

  private buildSafeFileName(fileName: string): string {
    return fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  }

  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.at(-1)?.toLowerCase() ?? '' : '';
  }
}
