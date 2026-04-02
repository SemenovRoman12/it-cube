export interface PersonalFileEntity {
  id: number;
  user_id: number;
  file_name: string;
  file_url: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export type PersonalFileCreate = Omit<PersonalFileEntity, 'id'>;

