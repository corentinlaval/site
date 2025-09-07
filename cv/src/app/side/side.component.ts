import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import {AppComponent} from '../app.component';

@Component({
  selector: 'app-side',
  standalone: true,
  imports: [NgIf],
  templateUrl: './side.component.html',
  styleUrls: ['./side.component.css'], // <- tableau, pas string
})
export class SideComponent {
  /** Titre principal (ex: "Menu", "Dépenses", "Planning") */
  @Input() title = 'Titre';

  /** Nom affiché (ex: "Corentin Laval") */
  @Input() displayName: string | null = null;

  /** Afficher/masquer le bouton thème */
  @Input() showThemeToggle = true;

  /** Événements */
  @Output() themeToggle = new EventEmitter<void>();
}
