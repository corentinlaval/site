import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { Auth, signOut } from '@angular/fire/auth';
import {Router, RouterLink} from '@angular/router';

@Component({
  selector: 'app-side',
  standalone: true,
  imports: [NgIf, RouterLink],
  templateUrl: './side.component.html',
  styleUrls: ['./side.component.css']
})
export class SideComponent {
  @Input() title = 'Titre';
  @Input() displayName: string | null = null;
  @Input() showThemeToggle = true;
  @Output() themeToggle = new EventEmitter<void>();

  private auth = inject(Auth);
  private router = inject(Router);

  async logout() {
    await signOut(this.auth);
    await this.router.navigate(['/login']); // redirige vers la page de login
  }
}
