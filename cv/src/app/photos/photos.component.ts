import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-photos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photos.component.html',
  styleUrl: './photos.component.css'
})
export class PhotosComponent {
  eventTitle = 'Remise de diplômes';
  eventDate = '15 juin 2024';

  images: string[] = [
    'https://picsum.photos/1200/800?random=1',
    'https://picsum.photos/1200/800?random=2',
    'https://picsum.photos/1200/800?random=3',
    'https://picsum.photos/1200/800?random=4',
    'https://picsum.photos/1200/800?random=5',
    'https://picsum.photos/1200/800?random=6',
    'https://picsum.photos/1200/800?random=7',
    'https://picsum.photos/1200/800?random=8',
    'https://picsum.photos/1200/800?random=9',
    'https://picsum.photos/1200/800?random=10'
  ];

  selectedIndex: number | null = null;

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {

    if (this.selectedIndex === null) return;

    switch (event.key) {

      case 'ArrowLeft':
        this.showPrevious();
        break;

      case 'ArrowRight':
        this.showNext();
        break;

      case 'Escape':
        this.closeImage();
        break;

      case '-':
        this.closeImage();
        break;
    }
  }
  downloadImage() {
    if (!this.selectedImage) return;

    fetch(this.selectedImage)
      .then(response => response.blob())
      .then(blob => {

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.eventTitle}.jpg`;

        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      });
  }

  openImage(index: number): void {
    this.selectedIndex = index;
  }

  closeImage(): void {
    this.selectedIndex = null;
  }

  showPrevious(): void {
    if (this.selectedIndex === null) return;
    this.selectedIndex =
      this.selectedIndex === 0 ? this.images.length - 1 : this.selectedIndex - 1;
  }

  showNext(): void {
    if (this.selectedIndex === null) return;
    this.selectedIndex =
      this.selectedIndex === this.images.length - 1 ? 0 : this.selectedIndex + 1;
  }

  get selectedImage(): string | null {
    if (this.selectedIndex === null) return null;
    return this.images[this.selectedIndex];
  }
}
