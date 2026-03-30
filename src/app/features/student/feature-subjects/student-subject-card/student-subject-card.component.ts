import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { StudentSubjectEntity } from '../../models/student-subject.model';

@Component({
  selector: 'student-subject-card',
  imports: [RouterLink, MatCardModule, MatIconModule, TranslateModule],
  templateUrl: './student-subject-card.component.html',
  styleUrl: './student-subject-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentSubjectCardComponent {
  public readonly subject = input.required<StudentSubjectEntity>();
  public readonly linkCommands = input.required<readonly (string | number)[]>();
  public readonly queryParams = input<Params>({});
  public readonly isFavorite = input(false);
  public readonly isHidden = input(false);

  public readonly favoriteToggle = output<void>();
  public readonly hiddenToggle = output<void>();

  public onFavoriteClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoriteToggle.emit();
  }

  public onHiddenClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.hiddenToggle.emit();
  }
}

