import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'teacher-lessons-list',
  imports: [],
  templateUrl: './teacher-lessons-list.component.html',
  styleUrl: './teacher-lessons-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherLessonsListComponent {
  private readonly route = inject(ActivatedRoute);

  public readonly groupId = this.route.snapshot.paramMap.get('groupId') ?? 0;
}
