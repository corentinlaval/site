// src/app/app.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { filter, firstValueFrom } from 'rxjs';
import { DataService } from './data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'cv';

  private auth = inject(Auth);
  private data = inject(DataService);

  async ngOnInit() {
    try {
      // 1) Attendre qu'un utilisateur soit connecté
      await firstValueFrom(authState(this.auth).pipe(filter(u => !!u)));

      // 2) S'assurer que le doc users/{uid} existe/est à jour
      await this.data.ensureUserDoc();

      // 3) Lancer le nettoyage (garder mois courant + mois précédent)
      //    -> nécessite l'index composite (uid ==, date <, orderBy(date)) sur "expenses"
      const deleted = await this.data.cleanupOldExpenses();
      // console.log('Cleanup terminé, docs supprimés :', deleted);
    } catch (err) {
      console.error('Init app error:', err);
    }
  }
}
