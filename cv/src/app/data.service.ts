// src/app/data.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, addDoc, doc, deleteDoc, updateDoc,
  query, where, orderBy, getDocs, CollectionReference, collectionData,
  Timestamp, serverTimestamp
} from '@angular/fire/firestore';
import { Auth, User, authState } from '@angular/fire/auth';
import { Observable, map, filter, switchMap, firstValueFrom } from 'rxjs';

export interface Expense {
  id?: string;            // pour idField
  uid: string;
  amount: number;
  category: string;
  note?: string;
  date: Timestamp;
  createdAt?: Timestamp;
}

export interface EventItem {
  id?: string;
  uid: string;
  title: string;
  start: Timestamp;
  end: Timestamp;
  location?: string;
  notes?: string;
  createdAt?: Timestamp;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private db = inject(Firestore);
  private auth = inject(Auth);
  displayName$: Observable<string | null> = authState(this.auth).pipe(
    map(u => u?.displayName ?? u?.email ?? null)
  );

  private expensesCol(): CollectionReference<Expense> {
    return collection(this.db, 'expenses') as CollectionReference<Expense>;
  }

  /** Attend un utilisateur prêt (currentUser peut être null au boot) */
  private async uidAwait(): Promise<string> {
    const cur = this.auth.currentUser;
    if (cur?.uid) return cur.uid;
    const user = await firstValueFrom(
      authState(this.auth).pipe(filter((u): u is User => u !== null))
    );
    return user.uid;
  }

  // ---------- CRUD Dépenses ----------
  async addExpense(input: { amount: number; category: string; note?: string; date: Date }) {
    const uid = await this.uidAwait();
    return addDoc(this.expensesCol(), {
      uid,
      amount: input.amount,
      category: input.category,
      note: input.note ?? '',
      date: Timestamp.fromDate(input.date),
      createdAt: serverTimestamp() as unknown as Timestamp
    });
  }

  listExpenses$(): Observable<Array<Expense & { id: string }>> {
    return authState(this.auth).pipe(
      filter((u): u is User => u !== null),
      switchMap((u) => {
        const qy = query(
          this.expensesCol(),
          where('uid', '==', u.uid),
          orderBy('date', 'desc')
        );
        return collectionData<Expense>(qy, { idField: 'id' });
      }),
      map((arr) => arr as Array<Expense & { id: string }>)
    );
  }

  async listExpensesOnce(): Promise<Array<Expense & { id: string }>> {
    const uid = await this.uidAwait();
    const qy = query(this.expensesCol(), where('uid', '==', uid), orderBy('date', 'desc'));
    const snap = await getDocs(qy);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Expense) }));
  }

  deleteExpense(id: string) {
    return deleteDoc(doc(this.db, 'expenses', id));
  }

  updateExpense(
    id: string,
    patch: Partial<{ amount: number; category: string; note: string; date: Date }>
  ) {
    const payload: any = { ...patch };
    if (patch.date) payload.date = Timestamp.fromDate(patch.date);
    return updateDoc(doc(this.db, 'expenses', id), payload);
  }

  // ---------- (optionnel) Events ----------
  private eventsCol(): CollectionReference<EventItem> {
    return collection(this.db, 'events') as CollectionReference<EventItem>;
  }

  async addEvent(input: { title: string; start: Date; end: Date; location?: string; notes?: string }) {
    const uid = await this.uidAwait();
    return addDoc(this.eventsCol(), {
      uid,
      title: input.title,
      start: Timestamp.fromDate(input.start),
      end: Timestamp.fromDate(input.end),
      location: input.location ?? '',
      notes: input.notes ?? '',
      createdAt: serverTimestamp() as unknown as Timestamp
    });
  }

  // --- LISTE / LECTURE EVENTS ---

  listEvents$(): Observable<Array<EventItem & { id: string }>> {
    return authState(this.auth).pipe(
      filter((u): u is User => u !== null),
      switchMap((u) => {
        const qy = query(
          this.eventsCol(),
          where('uid', '==', u.uid),
          orderBy('start', 'asc')
        );
        return collectionData<EventItem>(qy, { idField: 'id' });
      }),
      map(arr => arr as Array<EventItem & { id: string }>)
    );
  }

  /** évènements entre deux bornes (inclus début, exclu fin) */
  eventsBetween$(from: Date, to: Date): Observable<Array<EventItem & { id: string }>> {
    // On filtre après coup côté client (simple et efficace pour commencer)
    return this.listEvents$().pipe(
      map(list =>
        list.filter(e => {
          const s = e.start.toDate();
          return s >= from && s < to;
        })
      )
    );
  }

  deleteEvent(id: string) {
    return deleteDoc(doc(this.db, 'events', id));
  }

  updateEvent(
    id: string,
    patch: Partial<{ title: string; start: Date; end: Date; location: string; notes: string }>
  ) {
    const payload: any = { ...patch };
    if (patch.start) payload.start = Timestamp.fromDate(patch.start);
    if (patch.end)   payload.end   = Timestamp.fromDate(patch.end);
    return updateDoc(doc(this.db, 'events', id), payload);
  }
}

