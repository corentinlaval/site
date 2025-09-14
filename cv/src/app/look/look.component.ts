import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AsyncPipe, DatePipe, CurrencyPipe, NgFor } from '@angular/common';
import { Observable, Subscription, map } from 'rxjs';
import { DataService, Expense } from '../data.service';
import { Chart } from 'chart.js/auto';

type ViewMode = 'curve' | 'categories';
type CurveMode = 'daily' | 'cum';

@Component({
  standalone: true,
  selector: 'app-look',
  imports: [CommonModule, ReactiveFormsModule, NgFor, AsyncPipe, DatePipe, CurrencyPipe],
  templateUrl: './look.component.html',
  styleUrls: ['./look.component.css'],
})
export class LookComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private data = inject(DataService);

  // ===== Données =====
  expenses$: Observable<Array<Expense & { id: string }>> = this.data.listExpenses$();

  private readonly monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
  private readonly nextMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1, 0, 0, 0, 0);

  monthExpenses$: Observable<Array<Expense & { id: string }>> = this.expenses$.pipe(
    map(items =>
      items.filter(e => {
        const d = e.date?.toDate?.() as Date | undefined;
        return !!d && d >= this.monthStart && d < this.nextMonthStart;
      }),
    ),
  );

  monthTotal$: Observable<number> = this.monthExpenses$.pipe(
    map(items => items.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)),
  );
  monthCount$: Observable<number> = this.monthExpenses$.pipe(map(items => items.length));

  monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(this.monthStart);

  // ===== UI state =====
  view = signal<ViewMode>('curve');
  curveMode = signal<CurveMode>('daily');
  isFormOpen = signal(false);
  saving = signal(false);
  errorMsg = signal<string | null>(null);

  // ===== Formulaire =====
  form = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    category: ['courses', [Validators.required]],
    note: [''],
    dateStr: [this.toDateInputValue(new Date()), [Validators.required]], // yyyy-mm-dd
  });

  categories = [
    { key: 'logement', label: 'Logement' },
    { key: 'courses', label: 'Courses' },
    { key: 'loisirs', label: 'Loisirs' },
    { key: 'transport', label: 'Transport' },
    { key: 'sante', label: 'Santé' },
    { key: 'autre', label: 'Autre' },
  ];

  // ===== Graphs (Chart.js) =====
  private curveCanvasEl?: HTMLCanvasElement;
  private barCanvasEl?: HTMLCanvasElement;
  private curveChart?: Chart;
  private barChart?: Chart;

  // Setters ViewChild: à chaque (ré)apparition d’un canvas, on détruit l’ancienne instance et on recrée
  @ViewChild('curveCanvas')
  set curveCanvasRef(v: ElementRef<HTMLCanvasElement> | undefined) {
    this.curveCanvasEl = v?.nativeElement ?? undefined;
    if (!this.curveCanvasEl) return;

    // On repart propre
    this.curveChart?.destroy();
    if (this.view() === 'curve') {
      this.renderCurve();
      this.queueResizeFor('curve');
    }
  }

  @ViewChild('barCanvas')
  set barCanvasRef(v: ElementRef<HTMLCanvasElement> | undefined) {
    this.barCanvasEl = v?.nativeElement ?? undefined;
    if (!this.barCanvasEl) return;

    this.barChart?.destroy();
    if (this.view() === 'categories') {
      this.renderBars();
      this.queueResizeFor('categories');
    }
  }

  private sub?: Subscription;
  private monthRowsSnapshot: Array<Expense & { id: string }> = [];

  ngOnInit(): void {
    // snapshot local pour alimenter les graphes
    this.sub = this.monthExpenses$.subscribe(rows => {
      this.monthRowsSnapshot = rows ?? [];
      if (this.view() === 'curve') this.applyCurveModeToChart();
      if (this.view() === 'categories') this.updateBarDataset();
    });

    // si on change daily <-> cum, mettre à jour la courbe
    effect(() => {
      const _mode = this.curveMode();
      if (this.view() === 'curve') this.applyCurveModeToChart();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.curveChart?.destroy();
    this.barChart?.destroy();
  }

  // ===== Actions UI =====
  changeView(v?: 'curve' | 'categories') {
    const next: 'curve' | 'categories' = v ?? (this.view() === 'curve' ? 'categories' : 'curve');
    if (this.view() === next) {
      this.queueResizeFor(next);
      return;
    }

    // On détruit le chart de la vue quittée pour éviter les fuites et forcer un rerender propre
    if (next === 'curve') {
      this.barChart?.destroy();
      this.barChart = undefined;
    } else {
      this.curveChart?.destroy();
      this.curveChart = undefined;
    }

    // On laisse ngSwitch recréer le bon <canvas>, les setters ViewChild feront le rendu
    this.view.set(next);
    this.queueResizeFor(next);
  }

  // Resize fiable après reflow/transition
  private queueResizeFor(which: 'curve' | 'categories') {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (which === 'curve') this.curveChart?.resize();
        else this.barChart?.resize();
      });
    });
  }

  // Boutons Quotidien / Cumulé
  setCurveMode(mode: 'daily' | 'cum') {
    if (this.curveMode() === mode) return;
    this.curveMode.set(mode);
    // on force l’onglet Courbe si besoin
    if (this.view() !== 'curve') this.view.set('curve');
    this.applyCurveModeToChart();
    this.queueResizeFor('curve');
  }

  toggleForm() {
    this.isFormOpen.update(v => !v);
    this.queueResizeFor('curve');
  }

  // ===== CRUD =====
  async addExpense() {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const v = this.form.value;
      const date = v.dateStr ? new Date(v.dateStr as string) : new Date();

      await this.data.addExpense({
        amount: v.amount!,
        category: v.category!,
        note: v.note ?? '',
        date,
      });

      // reset (conserve la catégorie)
      this.form.patchValue({ amount: null, note: '', dateStr: this.toDateInputValue(new Date()) });
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Échec de l’ajout');
      console.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  delete(id?: string) {
    if (!id) return;
    this.data.deleteExpense(id);
  }

  // ===== Helpers =====
  private toDateInputValue(d: Date): string {
    // yyyy-mm-dd
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  // ===== Séries =====
  private buildMonthSeriesBoth(rows: Array<Expense & { id: string }>) {
    const start = new Date(this.monthStart);
    const end = new Date(this.nextMonthStart);
    const days: string[] = [];
    const daily: number[] = [];

    // index par yyyy-mm-dd
    const mapByDay = new Map<string, number>();
    for (const e of rows) {
      const d = e.date.toDate();
      const key = this.toDateInputValue(d);
      mapByDay.set(key, (mapByDay.get(key) || 0) + Number(e.amount || 0));
    }

    const it = new Date(start);
    while (it < end) {
      const key = this.toDateInputValue(it);
      days.push(new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(it));
      daily.push(mapByDay.get(key) || 0);
      it.setDate(it.getDate() + 1);
    }

    // cumul
    const cum: number[] = [];
    daily.reduce((acc, v, i) => {
      const s = acc + v;
      cum[i] = s;
      return s;
    }, 0);

    return { labels: days, daily, cum };
  }

  private buildCategorySeries(rows: Array<Expense & { id: string }>) {
    const sumsByCat = new Map<string, number>();
    for (const e of rows) {
      const k = e.category || 'autre';
      sumsByCat.set(k, (sumsByCat.get(k) || 0) + Number(e.amount || 0));
    }
    const labels = Array.from(sumsByCat.keys());
    const sums = labels.map(l => sumsByCat.get(l) || 0);
    return { labels, sums };
  }

  // ===== Charts =====
  private renderCurve() {
    if (!this.curveCanvasEl) return;

    const { labels, daily, cum } = this.buildMonthSeriesBoth(this.monthRowsSnapshot);
    const mode = this.curveMode();
    const data = mode === 'daily' ? daily : cum;

    this.curveChart?.destroy();
    this.curveChart = new Chart(this.curveCanvasEl, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: mode === 'daily' ? 'Quotidien (mois)' : 'Cumul (mois)',
            data,
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 10 } },
          y: { beginAtZero: true },
        },
      },
    });
  }

  private applyCurveModeToChart() {
    if (!this.curveChart) {
      this.renderCurve();
      return;
    }
    const { labels, daily, cum } = this.buildMonthSeriesBoth(this.monthRowsSnapshot);
    const mode = this.curveMode();
    this.curveChart.data.labels = labels;
    this.curveChart.data.datasets[0].data = (mode === 'daily' ? daily : cum) as any;
    this.curveChart.data.datasets[0].label = mode === 'daily' ? 'Quotidien (mois)' : 'Cumul (mois)';
    (this.curveChart.data.datasets[0] as any).stepped = mode === 'cum' ? 'middle' : false;
    this.curveChart.update('none');
  }

  private renderBars() {
    if (!this.barCanvasEl) return;

    const { labels, sums } = this.buildCategorySeries(this.monthRowsSnapshot);
    this.barChart?.destroy();
    this.barChart = new Chart(this.barCanvasEl, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Par catégories (mois)',
            data: sums,
            borderRadius: 8,
            barPercentage: 0.8,
            categoryPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
      },
    });
  }

  private updateBarDataset() {
    if (!this.barChart) return;
    const { labels, sums } = this.buildCategorySeries(this.monthRowsSnapshot);
    this.barChart.data.labels = labels;
    this.barChart.data.datasets[0].data = sums as any;
    this.barChart.update('none');
  }
}
