import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  standalone: true,
  selector: 'app-menu',
  imports: [CommonModule, RouterLink],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent {
  private auth = inject(Auth);

  // UI
  isLight = signal(false);

  // Mini-stats (placeholder): branche plus tard tes observables réels ici
  monthTotal = signal<number | null>(null);
  monthCount = signal<number | null>(null);
  nextEvent = signal<string | null>(null);

  toggleTheme() {
    this.isLight.update(v => !v);
    document.body.classList.toggle('light', this.isLight());
  }

  get displayName(): string {
    return this.auth.currentUser?.email ?? 'Connecté';
  }
}
