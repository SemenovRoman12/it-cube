import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { GroupEntity } from '../../../../core/models/group.model';
import { GroupsService } from '../../../admin/services/groups.service';
import { SubjectEntity } from '../../models/subject.model';
import { TeacherAssignmentsService } from '../../services/teacher-assignments.service';
import { TeacherGroupSubjectEntity } from '../../models/teacher-group-subject.model';

@Component({
  selector: 'teacher-lessons-list',
  imports: [CommonModule, MatCardModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './teacher-lessons-list.component.html',
  styleUrl: './teacher-lessons-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherLessonsListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly groupsService = inject(GroupsService);
  private readonly assignmentsService = inject(TeacherAssignmentsService);

  private readonly allAssignments = signal<TeacherGroupSubjectEntity[]>([]);
  private readonly allSubjects = signal<SubjectEntity[]>([]);

  public readonly subjects = signal<SubjectEntity[]>([]);
  public readonly selectedSubjectId = signal<number | null>(null);
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

  public readonly selectedSubjectName = computed(() => {
    const subjectId = this.selectedSubjectId();
    if (subjectId == null) {
      return '';
    }

    return this.subjects().find((subject) => subject.id === subjectId)?.name ?? '';
  });

  public ngOnInit(): void {
    console.log(this.subjects());
    this.loadPageData();
  }

  public onSubjectChange(subjectId: number): void {
    this.selectedSubjectId.set(subjectId);
  }

  private loadPageData(): void {
    const teacherId = this.authService.user()?.id;
    if (teacherId == null) {
      this.error.set('Не удалось определить преподавателя.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      assignments: this.assignmentsService.getTeacherAssignments(teacherId),
      groups: this.groupsService.getGroups(),
      subjects: this.assignmentsService.getSubjects(),
    }).subscribe({
      next: ({ assignments, groups, subjects }) => {
        this.allAssignments.set(assignments);
        this.allSubjects.set(subjects);

        const allowedGroupIds = new Set(assignments.map((item) => item.group_id));
        const availableGroups = groups.filter((group) => allowedGroupIds.has(group.id));

        if (!availableGroups.length) {
          this.error.set('Нет доступных групп.');
          this.isLoading.set(false);
          return;
        }

        const routeGroupId = Number(this.route.snapshot.paramMap.get('groupId'));
        const hasAccessToRouteGroup = availableGroups.some((group) => group.id === routeGroupId);

        if (!hasAccessToRouteGroup) {
          this.error.set('Доступ запрещен.');
          this.subjects.set([]);
          this.selectedSubjectId.set(null);
          this.isLoading.set(false);
          return;
        }

        this.syncSubjectsForGroup(routeGroupId);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Ошибка загрузки данных страницы.');
        this.isLoading.set(false);
      },
    });
  }

  private syncSubjectsForGroup(groupId: number): void {
    const allowedSubjectIds = new Set(
      this.allAssignments()
        .filter((assignment) => assignment.group_id === groupId)
        .map((assignment) => assignment.subject_id),
    );

    const availableSubjects = this.allSubjects().filter((subject) => allowedSubjectIds.has(subject.id));
    this.subjects.set(availableSubjects);

    const currentSubjectId = this.selectedSubjectId();
    const hasCurrent = availableSubjects.some((subject) => subject.id === currentSubjectId);
    this.selectedSubjectId.set(hasCurrent ? currentSubjectId : (availableSubjects[0]?.id ?? null));

  }
}
