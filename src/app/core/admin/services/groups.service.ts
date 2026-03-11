import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../http/api.service';
import { GroupEntity } from '../../models/group.model';

export type GroupCreate = Omit<GroupEntity, 'id'>;

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private readonly api = inject(ApiService);

  public getGroups(): Observable<GroupEntity[]> {
    return this.api.get<GroupEntity[]>('group');
  }

  public getGroupById(id: number): Observable<GroupEntity> {
    return this.api.get<GroupEntity>(`group/${id}`);
  }

  public createGroup(data: GroupCreate): Observable<GroupEntity> {
    return this.api.post<GroupCreate, GroupEntity>('group', data);
  }
}

