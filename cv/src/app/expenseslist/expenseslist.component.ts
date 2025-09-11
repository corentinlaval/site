import { Component } from '@angular/core';
import { AsyncPipe, CurrencyPipe, DatePipe, NgForOf, NgIf, CommonModule } from '@angular/common';
import { Observable, map } from 'rxjs';
import { DataService, Expense } from '../data.service';

@Component({
  selector: 'app-expenseslist',
  standalone: true,
  imports: [CommonModule, AsyncPipe, CurrencyPipe, DatePipe, NgForOf, NgIf],
  templateUrl: './expenseslist.component.html',
  styleUrls: ['./expenseslist.component.css']
})
export class ExpenseslistComponent {
  private readonly monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
  private readonly nextMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1, 0, 0, 0, 0);

  monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    .format(this.monthStart);

  private expenses$: Observable<Array<Expense & { id: string }>>;

  monthExpenses$: Observable<Array<Expense & { id: string }>>;

  constructor(private data: DataService) {
    this.expenses$ = this.data.listExpenses$();
    this.monthExpenses$ = this.expenses$.pipe(
      map(items => items.filter(e => {
        const d = e.date?.toDate?.() as Date | undefined;
        return !!d && d >= this.monthStart && d < this.nextMonthStart;
      }))
    );
  }

  trackById = (_: number, e: Expense & { id?: string }) => e.id ?? '';
}
