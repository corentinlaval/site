import { Component } from '@angular/core';
import { CommonModule, AsyncPipe, NgFor, DatePipe } from '@angular/common';
import { DataService, Expense } from '../data.service';
import { Observable } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { authState } from 'rxfire/auth';

@Component({
  standalone: true,
  selector: 'app-look',
  imports: [CommonModule, NgFor, AsyncPipe, DatePipe],
  templateUrl: './look.component.html',
  styleUrls: ['./look.component.css']
})
export class LookComponent {
  expenses$: Observable<Array<Expense & { id: string }>>;
  uid?: string;

  constructor(private data: DataService, private auth: Auth) {
    authState(this.auth).subscribe(u => {
      this.uid = (u as any)?.uid;
      console.log('UID:', this.uid);
    });
    this.expenses$ = this.data.listExpenses$();
  }

  async addMock() {
    await this.data.addExpense({ amount: 12, category: 'courses', date: new Date() });
  }

  del(id?: string) {
    if (!id) return;
    this.data.deleteExpense(id);
  }
}
