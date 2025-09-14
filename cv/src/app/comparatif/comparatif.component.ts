// src/app/comparatif/comparatif.component.ts
import {
  Component, ElementRef, ViewChild, OnInit, OnDestroy, inject, signal, effect
} from '@angular/core';
import { CommonModule, NgFor, NgIf, AsyncPipe } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Chart } from 'chart.js/auto';
import { DataService, Expense, UserLite } from '../data.service';
import { Auth, authState } from '@angular/fire/auth';
import {
  Observable, combineLatest, of, map, switchMap, debounceTime, distinctUntilChanged
} from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

type CurveMode = 'daily' | 'cum';

@Component({
  standalone: true,
  selector: 'app-comparatif',
  imports: [CommonModule, ReactiveFormsModule, NgFor, NgIf, AsyncPipe],
  templateUrl: './comparatif.component.html',
  styleUrls: ['./comparatif.component.css'],
})
export class ComparatifComponent implements OnInit, OnDestroy {
  private data = inject(DataService);
  private auth = inject(Auth);

  monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
  nextMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1, 0, 0, 0, 0);
  monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(this.monthStart);

  curveMode = signal<CurveMode>('daily');
  selectedPartnerUid = signal<string | null>(null);

  /** Catégories à afficher uniquement */
  private readonly allowedCategories = ['logement', 'courses', 'loisirs'];

  // --- Recherche ---
  search = new FormControl<string>('', { nonNullable: true });
  results$ = this.search.valueChanges.pipe(
    debounceTime(250),
    distinctUntilChanged(),
    switchMap(term => {
      const t = (term ?? '').trim();
      return t ? this.data.searchUsersByName$(t) : of([]);
    })
  );
  partners$ = this.data.partners$();

  // --- Données du mois courant ---
  myUid$ = authState(this.auth).pipe(map(u => u?.uid ?? null));

  myMonthRows$: Observable<Array<Expense & { id: string }>> = this.myUid$.pipe(
    switchMap(uid => uid ? this.data.expensesByUid$(uid) : of([])),
    map(rows => this.onlyThisMonthAndCats(rows))
  );

  partnerMonthRows$: Observable<Array<Expense & { id: string }>> =
    toObservable(this.selectedPartnerUid).pipe(
      switchMap(uid => uid ? this.data.expensesByUid$(uid) : of([])),
      map(rows => this.onlyThisMonthAndCats(rows))
    );

  both$ = combineLatest([this.myMonthRows$, this.partnerMonthRows$]);

  // --- Chart ---
  @ViewChild('curveCanvas') curveCanvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  // CACHE pour bascule instantanée daily <-> cum
  private lastLabels: string[] = [];
  private lastDailyMe: number[] = [];
  private lastDailyPa: number[] = [];

  ngOnInit(): void {
    // Recalcule à chaque changement de données
    this.both$.subscribe(([mine, partner]) => this.recomputeAndRender(mine, partner));

    // Changement de mode => applique sur le cache (instantané)
    effect(() => {
      const _m = this.curveMode();
      this.applyModeOnly();
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  // --- Actions ---
  setMode(m: CurveMode) {
    if (this.curveMode() === m) return;
    this.curveMode.set(m);
    this.applyModeOnly();
    requestAnimationFrame(() => this.chart?.resize());
  }

  pickPartner(uid: string) { this.selectedPartnerUid.set(uid); }
  async addPartner(u: UserLite) { await this.data.addPartner(u); this.pickPartner(u.uid); }
  async removePartner(uid: string) {
    await this.data.removePartner(uid);
    if (this.selectedPartnerUid() === uid) this.selectedPartnerUid.set(null);
  }

  // --- Helpers data ---
  private onlyThisMonthAndCats(rows: Array<Expense & { id: string }>) {
    return (rows ?? []).filter(r => {
      const d = r.date?.toDate?.() as Date | undefined;
      const cat = (r.category ?? '').toString().toLowerCase();
      return (
        d && d >= this.monthStart && d < this.nextMonthStart &&
        this.allowedCategories.includes(cat)
      );
    });
  }

  private toKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private buildDays() {
    const keys: string[] = [];
    const labels: string[] = [];
    const it = new Date(this.monthStart);
    while (it < this.nextMonthStart) {
      keys.push(this.toKey(it));
      labels.push(new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(it));
      it.setDate(it.getDate() + 1);
    }
    return { keys, labels };
  }

  private dailyArray(rows: Array<Expense & { id: string }>, keys: string[]) {
    const mapByDay = new Map<string, number>();
    for (const e of rows) {
      const k = this.toKey(e.date.toDate());
      mapByDay.set(k, (mapByDay.get(k) || 0) + Number(e.amount || 0));
    }
    return keys.map(k => mapByDay.get(k) || 0);
  }

  private toCum(arr: number[]) { let s = 0; return arr.map(v => (s += v)); }

  // --- Recompute daily from source rows, cache them, and render/update
  private recomputeAndRender(mine: Array<Expense & { id: string }>, partner: Array<Expense & { id: string }>) {
    const cvs = this.curveCanvas?.nativeElement;
    if (!cvs) return;

    const { keys, labels } = this.buildDays();
    this.lastLabels = labels;
    this.lastDailyMe = this.dailyArray(mine, keys);
    this.lastDailyPa = this.dailyArray(partner, keys);

    if (!this.chart) {
      const mode = this.curveMode();
      const d1 = mode === 'daily' ? this.lastDailyMe : this.toCum(this.lastDailyMe);
      const d2 = mode === 'daily' ? this.lastDailyPa : this.toCum(this.lastDailyPa);

      this.chart = new Chart(cvs, {
        type: 'line',
        data: {
          labels: this.lastLabels,
          datasets: [
            { label: 'Moi', data: d1, tension: 0.25, fill: false },
            { label: 'Partenaire', data: d2, tension: 0.25, fill: false },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 250 },
          plugins: { legend: { display: true } },
          scales: {
            x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 10 } },
            y: { beginAtZero: true },
          },
        },
      });
    } else {
      // met à jour les labels + séries (daily par défaut), puis applique le mode
      this.chart.data.labels = this.lastLabels;
      this.chart.data.datasets[0].data = this.lastDailyMe as any;
      this.chart.data.datasets[1].data = this.lastDailyPa as any;
      this.applyModeOnly();
    }
  }

  // --- Applique uniquement le mode (daily/cum) sur le cache, sans I/O
  private applyModeOnly() {
    if (!this.chart || this.lastLabels.length === 0) return;
    const mode = this.curveMode();
    const d1 = mode === 'daily' ? this.lastDailyMe : this.toCum(this.lastDailyMe);
    const d2 = mode === 'daily' ? this.lastDailyPa : this.toCum(this.lastDailyPa);

    this.chart.data.datasets[0].data = d1 as any;
    this.chart.data.datasets[1].data = d2 as any;
    (this.chart.data.datasets[0] as any).stepped = mode === 'cum' ? 'middle' : false;
    (this.chart.data.datasets[1] as any).stepped = mode === 'cum' ? 'middle' : false;
    this.chart.update('none');
  }
}
