// src/app/menu/menu.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { DataService, Expense } from '../data.service';
import { map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  selector: 'app-menu',
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent {
  private auth = inject(Auth);
  private data = inject(DataService);

  // thème
  isLight = signal(false);
  toggleTheme() {
    this.isLight.update(v => !v);
    document.body.classList.toggle('light', this.isLight());
  }

  // bornes mois courant
  private readonly start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  private readonly next  = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

  // stream Firestore -> dépenses utilisateur
  private expenses$ = this.data.listExpenses$();

  // filtre mois courant
  private monthExpenses$ = this.expenses$.pipe(
    map((items: Array<Expense & {id: string}>) =>
      items.filter(e => {
        const d = e.date?.toDate?.() as Date | undefined;
        return !!d && d >= this.start && d < this.next;
      })
    )
  );

  // Signals calculés à partir des observables
  monthTotal = toSignal(
    this.monthExpenses$.pipe(
      map(items => items.reduce((s, e) => s + (Number(e.amount) || 0), 0))
    ),
    { initialValue: 0 }
  );

  monthCount = toSignal(
    this.monthExpenses$.pipe(map(items => items.length)),
    { initialValue: 0 }
  );

  // placeholder pour “prochain évènement”
  nextEvent = signal<string | null>(null);

  get displayName(): string {
    return this.auth.currentUser?.displayName
      || this.auth.currentUser?.email
      || 'Connecté';
  }
}
