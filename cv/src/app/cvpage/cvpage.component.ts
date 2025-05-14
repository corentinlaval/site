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
    // Préfixe BOM pour que Windows reconnaisse l'UTF-8
    const BOM = '\uFEFF';

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Laval;Corentin;;;',
      'FN;CHARSET=UTF-8:Corentin Laval',
      'TITLE;CHARSET=UTF-8:Ingénieur Télécom – Futur Doctorant',
      'TEL;TYPE=CELL:+33-6-24-19-44-59',
      'EMAIL;TYPE=WORK:corentin@lavalcorentin.com',
      'END:VCARD'
    ].join('\r\n');

    // On inclut le BOM dans le Blob et on précise le charset dans le type MIME
    const blob = new Blob([BOM + vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Corentin_Laval.vcf';
    a.click();
    URL.revokeObjectURL(url);
  }
}
