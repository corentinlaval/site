import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DataService } from './data.service';  // <-- importe ton service

@Component({
  selector: 'app-root',
  standalone: true,        // important si tu utilises standalone
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'cv';

  private data = inject(DataService);

  ngOnInit() {
    // à chaque démarrage (après login) on s'assure que le doc user existe
    this.data.ensureUserDoc().catch(err => {
      console.error('Erreur ensureUserDoc', err);
    });
  }
}
