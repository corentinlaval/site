import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { SideComponent } from '../side/side.component';
import { DataService } from '../data.service';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, RouterOutlet, SideComponent],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css']
})
export class ShellComponent {
  displayName$!: Observable<string | null>;

  constructor(private data: DataService) {
    this.displayName$ = this.data.displayName$; // ✅ plus "used before init"
  }

  onThemeToggle() {
    // exemple très simple : alterner un data-attr sur <html>
    const root = document.documentElement;
    const isLight = root.getAttribute('data-theme') === 'light';
    root.setAttribute('data-theme', isLight ? 'dark' : 'light');
  }
}
