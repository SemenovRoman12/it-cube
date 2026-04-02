$base = 'https://3a2bd073afff529c.mokky.dev'

function PostJson($path, $body) {
  Invoke-RestMethod -Method Post -Uri ($base + '/' + $path) -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 10) | Out-Null
}

$users = @(
  @{ id = 1; full_name = 'Admin IT-Cube'; email = 'admin@itcube.local'; password = '123456'; role = 'admin'; group_id = $null; avatar_url = $null; created_at = '2026-04-01T08:00:00.000Z' },
  @{ id = 2; full_name = 'Anna Petrova'; email = 'teacher.math@itcube.local'; password = '123456'; role = 'teacher'; group_id = $null; avatar_url = $null; created_at = '2026-04-01T08:01:00.000Z' },
  @{ id = 3; full_name = 'Igor Smirnov'; email = 'teacher.code@itcube.local'; password = '123456'; role = 'teacher'; group_id = $null; avatar_url = $null; created_at = '2026-04-01T08:02:00.000Z' },
  @{ id = 4; full_name = 'Maria Volkova'; email = 'teacher.design@itcube.local'; password = '123456'; role = 'teacher'; group_id = $null; avatar_url = $null; created_at = '2026-04-01T08:03:00.000Z' },
  @{ id = 101; full_name = 'Aleksey Ivanov'; email = 'student101@itcube.local'; password = '123456'; role = 'user'; group_id = 1; avatar_url = $null; created_at = '2026-04-01T08:10:00.000Z' },
  @{ id = 102; full_name = 'Ekaterina Morozova'; email = 'student102@itcube.local'; password = '123456'; role = 'user'; group_id = 1; avatar_url = $null; created_at = '2026-04-01T08:11:00.000Z' },
  @{ id = 103; full_name = 'Dmitry Sokolov'; email = 'student103@itcube.local'; password = '123456'; role = 'user'; group_id = 1; avatar_url = $null; created_at = '2026-04-01T08:12:00.000Z' },
  @{ id = 104; full_name = 'Sofia Kuznetsova'; email = 'student104@itcube.local'; password = '123456'; role = 'user'; group_id = 2; avatar_url = $null; created_at = '2026-04-01T08:13:00.000Z' },
  @{ id = 105; full_name = 'Maxim Orlov'; email = 'student105@itcube.local'; password = '123456'; role = 'user'; group_id = 2; avatar_url = $null; created_at = '2026-04-01T08:14:00.000Z' },
  @{ id = 106; full_name = 'Polina Lebedeva'; email = 'student106@itcube.local'; password = '123456'; role = 'user'; group_id = 2; avatar_url = $null; created_at = '2026-04-01T08:15:00.000Z' },
  @{ id = 107; full_name = 'Kirill Fyodorov'; email = 'student107@itcube.local'; password = '123456'; role = 'user'; group_id = 3; avatar_url = $null; created_at = '2026-04-01T08:16:00.000Z' },
  @{ id = 108; full_name = 'Darya Novikova'; email = 'student108@itcube.local'; password = '123456'; role = 'user'; group_id = 3; avatar_url = $null; created_at = '2026-04-01T08:17:00.000Z' },
  @{ id = 109; full_name = 'Timur Pavlov'; email = 'student109@itcube.local'; password = '123456'; role = 'user'; group_id = 3; avatar_url = $null; created_at = '2026-04-01T08:18:00.000Z' }
)

$groups = @(
  @{ id = 1; name = 'Python Development 1' },
  @{ id = 2; name = 'Web Development 1' },
  @{ id = 3; name = 'Graphic Design 1' }
)

$subjects = @(
  @{ id = 1; name = 'Python' },
  @{ id = 2; name = 'Algorithms' },
  @{ id = 3; name = 'HTML/CSS' },
  @{ id = 4; name = 'JavaScript' },
  @{ id = 5; name = 'UI/UX Design' }
)

$assignments = @(
  @{ id = 1; teacher_id = 2; group_id = 1; subject_id = 1 },
  @{ id = 2; teacher_id = 2; group_id = 1; subject_id = 2 },
  @{ id = 3; teacher_id = 3; group_id = 2; subject_id = 3 },
  @{ id = 4; teacher_id = 3; group_id = 2; subject_id = 4 },
  @{ id = 5; teacher_id = 4; group_id = 3; subject_id = 5 }
)

$lessons = @(
  @{ id = 1; teacher_id = 2; group_id = 1; subject_id = 1; date = '2026-03-20'; topic = 'Variables and Data Types' },
  @{ id = 2; teacher_id = 2; group_id = 1; subject_id = 1; date = '2026-03-27'; topic = 'Conditional Statements' },
  @{ id = 3; teacher_id = 2; group_id = 1; subject_id = 1; date = '2026-04-01'; topic = 'Python homework'; lesson_type = 'assignment'; title = 'Python practice'; description = 'Write a console calculator and attach the solution file.'; due_at = '2026-04-05T16:59:00.000Z'; created_at = '2026-04-01T09:00:00.000Z'; updated_at = '2026-04-01T09:00:00.000Z' },
  @{ id = 4; teacher_id = 3; group_id = 2; subject_id = 3; date = '2026-03-24'; topic = 'Semantic markup' },
  @{ id = 5; teacher_id = 3; group_id = 2; subject_id = 4; date = '2026-03-31'; topic = 'JavaScript events' },
  @{ id = 6; teacher_id = 3; group_id = 2; subject_id = 4; date = '2026-04-01'; topic = 'JavaScript homework'; lesson_type = 'assignment'; title = 'DOM and events'; description = 'Build an interactive page and upload a project archive.'; due_at = '2026-04-06T16:59:00.000Z'; created_at = '2026-04-01T09:10:00.000Z'; updated_at = '2026-04-01T09:10:00.000Z' },
  @{ id = 7; teacher_id = 4; group_id = 3; subject_id = 5; date = '2026-04-01'; topic = 'UI/UX homework'; lesson_type = 'assignment'; title = 'Landing page mockup'; description = 'Prepare a landing page mockup and attach the source file or archive.'; due_at = '2026-04-07T16:59:00.000Z'; created_at = '2026-04-01T09:20:00.000Z'; updated_at = '2026-04-01T09:20:00.000Z' }
)

$journalEntries = @(
  @{ id = 1; lesson_id = 1; student_id = 101; mark = 5; attendance = 'present'; comment = 'Excellent work' },
  @{ id = 2; lesson_id = 1; student_id = 102; mark = 4; attendance = 'present'; comment = 'Good result' },
  @{ id = 3; lesson_id = 1; student_id = 103; mark = 5; attendance = 'late'; comment = 'Answered after class started' },
  @{ id = 4; lesson_id = 2; student_id = 101; mark = 5; attendance = 'present'; comment = 'No mistakes' },
  @{ id = 5; lesson_id = 2; student_id = 102; mark = 4; attendance = 'present'; comment = 'One small issue' },
  @{ id = 6; lesson_id = 2; student_id = 103; mark = 3; attendance = 'present'; comment = 'Need more practice' },
  @{ id = 7; lesson_id = 4; student_id = 104; mark = 5; attendance = 'present'; comment = 'Excellent markup' },
  @{ id = 8; lesson_id = 4; student_id = 105; mark = 4; attendance = 'present'; comment = 'Good layout' },
  @{ id = 9; lesson_id = 4; student_id = 106; mark = 4; attendance = 'excused'; comment = 'Submitted later' },
  @{ id = 10; lesson_id = 5; student_id = 104; mark = 5; attendance = 'present'; comment = 'Strong solution' },
  @{ id = 11; lesson_id = 5; student_id = 105; mark = 5; attendance = 'present'; comment = 'Well done' },
  @{ id = 12; lesson_id = 5; student_id = 106; mark = 4; attendance = 'present'; comment = 'Solid work' }
)

$submissions = @(
  @{ id = 1; lesson_id = 3; student_id = 101; created_by_student_id = 101; is_group_submission = $false; answer_text = 'Implemented a console calculator in Python and tested basic operations.'; submitted_at = '2026-04-01T10:00:00.000Z'; status = 'submitted'; teacher_comment = ''; mark = $null },
  @{ id = 2; lesson_id = 3; student_id = 102; created_by_student_id = 102; is_group_submission = $true; answer_text = 'Prepared a team solution with extra tests.'; submitted_at = '2026-04-01T10:15:00.000Z'; status = 'submitted'; teacher_comment = ''; mark = $null },
  @{ id = 3; lesson_id = 6; student_id = 104; created_by_student_id = 104; is_group_submission = $false; answer_text = 'Built a page with event handlers and a modal dialog.'; submitted_at = '2026-04-01T10:20:00.000Z'; status = 'submitted'; teacher_comment = ''; mark = $null },
  @{ id = 4; lesson_id = 7; student_id = 107; created_by_student_id = 107; is_group_submission = $false; answer_text = 'Prepared the first draft of the Figma mockup.'; submitted_at = $null; status = 'pending'; teacher_comment = ''; mark = $null }
)

$members = @(
  @{ id = 1; submission_id = 1; lesson_id = 3; student_id = 101; role = 'creator'; status = 'accepted'; invited_by_student_id = 101; invited_at = '2026-04-01T10:00:00.000Z'; responded_at = '2026-04-01T10:00:00.000Z'; left_at = $null },
  @{ id = 2; submission_id = 2; lesson_id = 3; student_id = 102; role = 'creator'; status = 'accepted'; invited_by_student_id = 102; invited_at = '2026-04-01T10:15:00.000Z'; responded_at = '2026-04-01T10:15:00.000Z'; left_at = $null },
  @{ id = 3; submission_id = 2; lesson_id = 3; student_id = 103; role = 'member'; status = 'accepted'; invited_by_student_id = 102; invited_at = '2026-04-01T10:15:00.000Z'; responded_at = '2026-04-01T10:17:00.000Z'; left_at = $null },
  @{ id = 4; submission_id = 3; lesson_id = 6; student_id = 104; role = 'creator'; status = 'accepted'; invited_by_student_id = 104; invited_at = '2026-04-01T10:20:00.000Z'; responded_at = '2026-04-01T10:20:00.000Z'; left_at = $null },
  @{ id = 5; submission_id = 4; lesson_id = 7; student_id = 107; role = 'creator'; status = 'accepted'; invited_by_student_id = 107; invited_at = '2026-04-01T10:25:00.000Z'; responded_at = '2026-04-01T10:25:00.000Z'; left_at = $null }
)

$notifications = @(
  @{ id = 1; user_id = 103; type = 'submission_invited'; title = 'Invitation to team submission'; message = 'Ekaterina Morozova invited you to a shared Python submission.'; is_read = $false; created_at = '2026-04-01T10:15:00.000Z'; read_at = $null; lesson_id = 3; subject_id = 1; group_id = 1; teacher_id = 2; student_id = 102; submission_id = 2; submission_member_id = 3; mark = $null; entity_kind = 'lesson_submission_member'; entity_id = 3; link = '/student/lessons/3' },
  @{ id = 2; user_id = 101; type = 'mark_assigned'; title = 'Grade assigned'; message = 'A grade of 5 was assigned for the lesson Conditional Statements.'; is_read = $false; created_at = '2026-04-01T10:30:00.000Z'; read_at = $null; lesson_id = 2; subject_id = 1; group_id = 1; teacher_id = 2; student_id = 101; submission_id = $null; submission_member_id = $null; mark = 5; entity_kind = 'journal_entry'; entity_id = 4; link = '/student/journal' }
)

foreach ($item in $groups) { PostJson 'group' $item }
foreach ($item in $subjects) { PostJson 'subjects' $item }
foreach ($item in $users) { PostJson 'users' $item }
foreach ($item in $assignments) { PostJson 'teacher_group_subjects' $item }
foreach ($item in $lessons) { PostJson 'lessons' $item }
foreach ($item in $journalEntries) { PostJson 'journal_entries' $item }
foreach ($item in $submissions) { PostJson 'lesson_submissions' $item }
foreach ($item in $members) { PostJson 'lesson_submission_members' $item }
foreach ($item in $notifications) { PostJson 'notifications' $item }

Write-Output 'Seed completed'
