// src/app/plan/plan.component.ts
import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DataService, EventItem } from '../data.service';
import { Observable, map } from 'rxjs';

type CalendarDay = {
  date: Date;
  inMonth: boolean;
  events: Array<EventItem & { id: string }>;
};

@Component({
  standalone: true,
  selector: 'app-plan',
  imports: [CommonModule, ReactiveFormsModule, NgFor, NgIf, AsyncPipe, DatePipe],
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.css']
})
export class PlanComponent {
  // DI via inject() to avoid "used before initialization"
  private fb = inject(FormBuilder);
  private data = inject(DataService);

  // --- UI state
  saving = signal(false);
  errorMsg = signal<string | null>(null);

  // --- date affichée
  today = new Date();
  shown = signal(new Date(this.today.getFullYear(), this.today.getMonth(), 1));

  // bornes du mois affiché
  monthStart = computed(() => new Date(this.shown().getFullYear(), this.shown().getMonth(), 1));
  nextMonthStart = computed(() => new Date(this.shown().getFullYear(), this.shown().getMonth() + 1, 1));

  // évènements du mois affiché
  monthEvents$: Observable<Array<EventItem & { id: string }>> =
    this.data.eventsBetween$(this.monthStart(), this.nextMonthStart());

  // calendrier (6 x 7)
  calendar$: Observable<CalendarDay[]> = this.buildCalendar$();

  // prochains évènements
  upcoming$: Observable<Array<EventItem & { id: string }>> = this.data.listEvents$().pipe(
    map(list => list
      .filter(e => (e.end?.toDate?.() ?? e.start.toDate()) >= new Date())
      .slice(0, 3)
    )
  );

  // formulaire
  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    date: [new Date(), Validators.required],
    start: ['09:00', Validators.required],
    end:   ['10:00', Validators.required],
    location: [''],
    notes: ['']
  });

  monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    .format(this.shown());

  prevMonth() {
    const d = this.shown();
    this.shown.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.onMonthChanged();
  }

  nextMonth() {
    const d = this.shown();
    this.shown.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.onMonthChanged();
  }

  private onMonthChanged() {
    this.monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
      .format(this.shown());
    this.monthEvents$ = this.data.eventsBetween$(this.monthStart(), this.nextMonthStart());
    this.calendar$ = this.buildCalendar$();
  }

  private buildCalendar$(): Observable<CalendarDay[]> {
    return this.monthEvents$.pipe(
      map(events => {
        const firstDay = this.monthStart();
        const startWeekday = (firstDay.getDay() + 6) % 7; // Lundi=0
        const startGrid = new Date(firstDay);
        startGrid.setDate(firstDay.getDate() - startWeekday);

        const cells: CalendarDay[] = [];
        for (let i = 0; i < 42; i++) {
          const d = new Date(startGrid);
          d.setDate(startGrid.getDate() + i);
          const inMonth = d.getMonth() === firstDay.getMonth();
          const dayEvents = events.filter(e => sameDay(e.start.toDate(), d));
          cells.push({ date: d, inMonth, events: dayEvents });
        }
        return cells;
      })
    );
  }

  async addEvent() {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const v = this.form.value;
      const date = v.date as Date;
      const [sh, sm] = (v.start as string).split(':').map(Number);
      const [eh, em] = (v.end as string).split(':').map(Number);

      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), sh ?? 0, sm ?? 0);
      const end   = new Date(date.getFullYear(), date.getMonth(), date.getDate(), eh ?? 0, em ?? 0);
      if (end <= start) throw new Error('Heure de fin ≤ heure de début');

      await this.data.addEvent({
        title: v.title!,
        start,
        end,
        location: v.location ?? '',
        notes: v.notes ?? ''
      });

      this.form.patchValue({ title: '', notes: '', start: '09:00', end: '10:00' });
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Échec de l’ajout');
      console.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  delete(id?: string) {
    if (!id) return;
    this.data.deleteEvent(id);
  }
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
