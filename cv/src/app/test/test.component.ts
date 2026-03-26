import { Component } from '@angular/core';
import { NgForOf } from '@angular/common';

export interface Article {
  id: number;
  title: string;
  price: number;
  location: string;
  imageUrl: string;
  status: 'new' | 'very-good' | 'good' | 'used';
}

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [NgForOf],
  templateUrl: './test.component.html',
  styleUrl: './test.component.css'
})
export class TestComponent {
  articles: Article[] = [
    {
      id: 1,
      title: 'Vélo de route',
      price: 250,
      location: 'Lyon',
      imageUrl: 'https://picsum.photos/200',
      status: 'very-good'
    },
    {
      id: 2,
      title: 'Canapé 3 places',
      price: 120,
      location: 'Villeurbanne',
      imageUrl: 'https://picsum.photos/200',
      status: 'very-good'
    }
  ];
}
