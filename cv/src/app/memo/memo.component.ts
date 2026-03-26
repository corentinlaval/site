import { Component } from '@angular/core';
import { NgForOf } from '@angular/common';

@Component({
  selector: 'app-memo',
  imports: [NgForOf],
  templateUrl: './memo.component.html',
  styleUrl: './memo.component.css'
})
export class MemoComponent {

  cartes: any[] = [];
  bloque = false;

  ngOnInit() {
    this.initCartes();
  }

  initCartes() {
    const valeurs = [1, 2, 3];
    let cartesTemp: any[] = [];

    valeurs.forEach(v => {
      cartesTemp.push({ id: v, flipped: false, found: false });
      cartesTemp.push({ id: v, flipped: false, found: false });
    });

    this.cartes = this.shuffle(cartesTemp);
  }

  shuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  onCardClick(carte: any) {
    if (this.bloque || carte.flipped || carte.found) {
      return;
    }

    carte.flipped = true;

    const cartesRetournees = this.cartes.filter(c => c.flipped && !c.found);

    if (cartesRetournees.length === 2) {
      this.check(cartesRetournees);
    }
  }

  check(cartesRetournees: any[]) {
    const [carte1, carte2] = cartesRetournees;

    if (carte1.id === carte2.id) {
      carte1.found = true;
      carte2.found = true;
      return;
    }

    this.bloque = true;

    setTimeout(() => {
      carte1.flipped = false;
      carte2.flipped = false;
      this.bloque = false;
    }, 1000);
  }
}
