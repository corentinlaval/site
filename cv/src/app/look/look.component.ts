import {
  Component, ViewChild, ElementRef, OnDestroy, AfterViewInit, signal
} from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe, NgFor, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Observable, map, Subscription } from 'rxjs';
import { DataService, Expense } from '../data.service';
import Chart from 'chart.js/auto';

@Component({
  standalone: true,
  selector: 'app-look',
  imports: [CommonModule, ReactiveFormsModule, NgFor, AsyncPipe, DatePipe, CurrencyPipe],
  templateUrl: './look.component.html',
  styleUrls: ['./look.component.css']
})
export class LookComponent implements AfterViewInit, OnDestroy {
  // Déclarations (on les remplit dans le constructor)
  expenses$!: Observable<Array<Expense & { id: string }>>;
  monthExpenses$!: Observable<Array<Expense & { id: string }>>;
  monthTotal$!: Observable<number>;
  monthCount$!: Observable<number>;
  form!: FormGroup;

  // borne mois
  private readonly monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
  private readonly nextMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1, 0, 0, 0, 0);
  monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(this.monthStart);

  // UI
  saving = signal(false);
  errorMsg = signal<string | null>(null);

  categories = [
    { key: 'logement',  label: 'Logement' },
    { key: 'courses',   label: 'Courses' },
    { key: 'transport', label: 'Transport' },
    { key: 'loisirs',   label: 'Loisirs' },
    { key: 'sante',     label: 'Santé' },
    { key: 'autre',     label: 'Autre' }
  ];

  // Graphiques
  @ViewChild('curveCanvas') curveCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas')   barCanvas!: ElementRef<HTMLCanvasElement>;
  private curveChart?: Chart;
  private barChart?: Chart;
  private dataSub?: Subscription;

  // onglet courbe/barres
  view = signal<'curve' | 'categories'>('curve');
  changeView(v: 'curve' | 'categories') { this.view.set(v); }

  constructor(private fb: FormBuilder, private data: DataService) {
    // ⚠️ on assigne ici (pas en propriété) pour éviter TS2729
    this.expenses$ = this.data.listExpenses$();

    this.monthExpenses$ = this.expenses$.pipe(
      map(items => items.filter(e => {
        const d = e.date?.toDate?.() as Date | undefined;
        return !!d && d >= this.monthStart && d < this.nextMonthStart;
      }))
    );

    this.monthTotal$ = this.monthExpenses$.pipe(
      map(items => items.reduce((sum, e) => sum + (Number(e.amount) || 0), 0))
    );
    this.monthCount$ = this.monthExpenses$.pipe(map(items => items.length));

    this.form = this.fb.group({
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
      category: ['courses', [Validators.required]],
      note: [''],
      dateStr: [this.toInputDateString(new Date()), [Validators.required]]
    });
  }

  ngAfterViewInit(): void {
    // instancie les charts
    this.curveChart = new Chart(this.curveCanvas.nativeElement, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Cumul du mois (€)', data: [] }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Par catégorie (€)', data: [] }] },
      options: { responsive: true, maintainAspectRatio: false }
    });

    // nourrit les charts
    this.dataSub = this.monthExpenses$.subscribe(items => {
      const { labels: dayLabels, series: daySeries } = this.buildDailyCumulative(items);
      this.replaceChartData(this.curveChart!, dayLabels, daySeries);

      const catAgg = this.aggregateByCategory(items);
      const catLabels = Object.keys(catAgg);
      const catSeries = catLabels.map(k => catAgg[k]);
      this.replaceChartData(this.barChart!, catLabels, catSeries);
    });
  }

  ngOnDestroy(): void {
    this.dataSub?.unsubscribe();
    this.curveChart?.destroy();
    this.barChart?.destroy();
  }

  // Actions
  async addExpense() {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const v = this.form.value;
      await this.data.addExpense({
        amount: v['amount']!,
        category: v['category']!,
        note: v['note'] ?? '',
        date: this.fromInputDateString(v['dateStr']!)
      });
      this.form.patchValue({ amount: null, note: '', dateStr: this.toInputDateString(new Date()) });
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

  // Helpers
  private toInputDateString(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  private fromInputDateString(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0); // éviter les soucis de fuseau
  }
  private replaceChartData(chart: Chart, labels: string[], data: number[]) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  }
  private buildDailyCumulative(items: Array<Expense & { id: string }>) {
    const byDay = new Map<string, number>();
    for (const e of items) {
      const key = this.toInputDateString(e.date.toDate());
      byDay.set(key, (byDay.get(key) ?? 0) + Number(e.amount || 0));
    }
    const labels: string[] = [];
    const series: number[] = [];
    const cursor = new Date(this.monthStart);
    const end = this.nextMonthStart;
    let acc = 0;
    while (cursor < end) {
      const key = this.toInputDateString(cursor);
      acc += byDay.get(key) ?? 0;
      labels.push(new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(cursor));
      series.push(Number(acc.toFixed(2)));
      cursor.setDate(cursor.getDate() + 1);
    }
    return { labels, series };
  }
  private aggregateByCategory(items: Array<Expense & { id: string }>) {
    const agg: Record<string, number> = {};
    for (const e of items) {
      const k = e.category || 'autre';
      agg[k] = (agg[k] ?? 0) + Number(e.amount || 0);
    }
    return agg;
  }
}
