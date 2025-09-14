// src/app/data.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, addDoc, doc, deleteDoc, updateDoc, setDoc, getDocs,
  query, where, orderBy, startAt, endAt, limit,
  CollectionReference, collectionData, Timestamp, serverTimestamp
} from '@angular/fire/firestore';
import { Auth, User, authState } from '@angular/fire/auth';
import {
  Observable, of, combineLatest, firstValueFrom
} from 'rxjs';
import { map, filter, switchMap } from 'rxjs/operators';

export interface Expense {
  id?: string;              // pour idField
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

export interface UserLite {
  uid: string;
  displayName: string;
  displayName_lc?: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private db = inject(Firestore);
  private auth = inject(Auth);

  // ====== Infos de confort ======
  displayName$: Observable<string | null> = authState(this.auth).pipe(
    map(u => u?.displayName ?? u?.email ?? null)
  );
  myUid$: Observable<string | null> = authState(this.auth).pipe(map(u => u?.uid ?? null));

  // ====== Helpers collections ======
  private expensesCol(): CollectionReference<Expense> {
    return collection(this.db, 'expenses') as CollectionReference<Expense>;
  }
  private eventsCol(): CollectionReference<EventItem> {
    return collection(this.db, 'events') as CollectionReference<EventItem>;
  }
  private usersCol(): CollectionReference<any> {
    return collection(this.db, 'users') as CollectionReference<any>;
  }

  /** Attend que l’utilisateur soit prêt et renvoie son uid. */
  private async uidAwait(): Promise<string> {
    const cur = this.auth.currentUser;
    if (cur?.uid) return cur.uid;
    const user = await firstValueFrom(authState(this.auth).pipe(filter((u): u is User => !!u)));
    return user.uid;
  }

  // ========================================================
  //                      DÉPENSES
  // ========================================================
  async addExpense(input: { amount: number; category: string; note?: string; date: Date }) {
    const uid = await this.uidAwait();
    return addDoc(this.expensesCol(), {
      uid,
      amount: input.amount,
      category: input.category,
      note: input.note ?? '',
      date: Timestamp.fromDate(input.date),
      createdAt: serverTimestamp() as unknown as Timestamp,
    });
  }

  listExpenses$(): Observable<Array<Expense & { id: string }>> {
    return authState(this.auth).pipe(
      filter((u): u is User => !!u),
      switchMap((u) => {
        const qy = query(
          this.expensesCol(),
          where('uid', '==', u.uid),
          orderBy('date', 'desc')
        );
        return collectionData<Expense>(qy, { idField: 'id' });
      }),
      map(arr => arr as Array<Expense & { id: string }>)
    );
  }

  /** Dépenses d’un utilisateur (pour comparatif). */
  expensesByUid$(uid: string): Observable<Array<Expense & { id: string }>> {
    const qy = query(this.expensesCol(), where('uid', '==', uid), orderBy('date', 'asc'));
    return collectionData<Expense>(qy, { idField: 'id' })
      .pipe(map(arr => arr as Array<Expense & { id: string }>));
  }

  async listExpensesOnce(): Promise<Array<Expense & { id: string }>> {
    const uid = await this.uidAwait();
    const qy = query(this.expensesCol(), where('uid', '==', uid), orderBy('date', 'desc'));
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Expense) }));
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

  // ========================================================
  //                      EVENTS (optionnel)
  // ========================================================
  listEvents$(): Observable<Array<EventItem & { id: string }>> {
    return authState(this.auth).pipe(
      filter((u): u is User => !!u),
      switchMap((u) => {
        const qy = query(this.eventsCol(), where('uid', '==', u.uid), orderBy('start', 'asc'));
        return collectionData<EventItem>(qy, { idField: 'id' });
      }),
      map(arr => arr as Array<EventItem & { id: string }>)
    );
  }

  // ========================================================
  //                USERS / PARTENAIRES / RECHERCHE
  // ========================================================

  /** Upsert users/{uid} — à appeler une fois après login. */
  async ensureUserDoc() {
    const uid = await this.uidAwait();
    const u = this.auth.currentUser!;
    const handle = (u.displayName && u.displayName.trim())
      ? u.displayName.trim()
      : (u.email?.split('@')[0] ?? '').trim();
    await setDoc(
      doc(this.db, `users/${uid}`),
      {
        uid,
        displayName: u.displayName ?? handle,
        displayName_lc: (u.displayName ?? handle).toLowerCase(),
        email: u.email ?? '',
        email_lc: (u.email ?? '').toLowerCase(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * Recherche préfixe multi-champs : displayName_lc, email_lc, displayNameLower, emailLower.
   * Fusionne et déduplique par uid.
   */
  searchUsersByName$(term: string): Observable<UserLite[]> {
    const t = (term || '').trim().toLowerCase();
    if (!t) return of([]);

    const col = this.usersCol();
    const fields = ['displayName_lc', 'email_lc', 'displayNameLower', 'emailLower'] as const;

    const streams = fields.map(f => {
      const qy = query(
        col,
        orderBy(f as string),
        startAt(t),
        endAt(t + '\uf8ff'),
        limit(10)
      );
      return collectionData(qy, { idField: 'uid' }) as Observable<any[]>;
    });

    return combineLatest(streams).pipe(
      map(chunks => {
        const byUid = new Map<string, any>();
        for (const r of chunks.flat()) byUid.set(r.uid, r);
        return Array.from(byUid.values()).map(r => ({
          uid: r.uid,
          displayName: r.displayName || r.email || '(sans nom)',
          displayName_lc: (r.displayName_lc ?? r.displayNameLower ?? r.displayName ?? '').toLowerCase(),
          email: r.email ?? r.emailLower ?? ''
        }) as UserLite);
      })
    );
  }

  /** Liste des partenaires mémorisés : users/{me}/partners */
  partners$(): Observable<UserLite[]> {
    return authState(this.auth).pipe(
      filter((u): u is User => !!u),
      switchMap((u) => {
        const col = collection(this.db, `users/${u.uid}/partners`);
        return collectionData(col, { idField: 'uid' }) as Observable<any[]>;
      }),
      map(rows => (rows ?? []).map(r => ({
        uid: r.uid,
        displayName: r.displayName || r.email || '(inconnu)',
        displayName_lc: r.displayName_lc ?? (r.displayName ?? '').toLowerCase(),
        email: r.email
      }) as UserLite))
    );
  }

  /** Ajoute un partenaire users/{me}/partners/{partnerUid} */
  async addPartner(partner: UserLite) {
    const myUid = await this.uidAwait();
    const ref = doc(this.db, `users/${myUid}/partners/${partner.uid}`);
    await setDoc(ref, {
      uid: partner.uid,
      displayName: partner.displayName,
      displayName_lc: partner.displayName_lc ?? partner.displayName.toLowerCase(),
      email: partner.email ?? '',
      createdAt: serverTimestamp(),
    });
  }

  /** Supprime un partenaire mémorisé */
  async removePartner(partnerUid: string) {
    const myUid = await this.uidAwait();
    await deleteDoc(doc(this.db, `users/${myUid}/partners/${partnerUid}`));
  }

  // --- EVENTS: créer / lister entre bornes / supprimer ---
  async addEvent(input: { title: string; start: Date; end: Date; location?: string; notes?: string }) {
    const uid = await this.uidAwait();
    return addDoc(this.eventsCol(), {
      uid,
      title: input.title,
      start: Timestamp.fromDate(input.start),
      end: Timestamp.fromDate(input.end),
      location: input.location ?? '',
      notes: input.notes ?? '',
      createdAt: serverTimestamp() as unknown as Timestamp,
    });
  }

  eventsBetween$(from: Date, to: Date) {
    return this.listEvents$().pipe(
      map(list =>
        (list ?? []).filter(e => {
          const s = e.start.toDate();
          return s >= from && s < to;
        })
      )
    );
  }

  deleteEvent(id: string) {
    return deleteDoc(doc(this.db, 'events', id));
  }
}
