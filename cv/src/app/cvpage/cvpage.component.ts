import { Component } from '@angular/core';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-cvpage',
  imports: [
    NgIf
  ],
  templateUrl: './cvpage.component.html',
  styleUrl: './cvpage.component.css'
})
export class CvpageComponent {
  hover = false;

  downloadVcard() {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Laval;Corentin;;;',
      'FN:Corentin Laval',
      'TITLE:Ingénieur Télécom & Future Doctorant',
      'TEL;TYPE=CELL:+33-6-24-19-44-59',
      'EMAIL;TYPE=WORK:corentin@lavalcorentin.com',
      'END:VCARD'
    ].join('\r\n');

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Corentin_Laval.vcf';
    a.click();
    URL.revokeObjectURL(url);
  }
}
