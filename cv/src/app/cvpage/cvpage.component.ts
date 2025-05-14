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
    // Construction en vCard 2.1, accents en quoted-printable
    const vcardLines = [
      'BEGIN:VCARD',
      'VERSION:2.1',
      'N:Laval;Corentin;;;',
      'FN:Corentin Laval',
      'TITLE;CHARSET=ISO-8859-1;ENCODING=QUOTED-PRINTABLE:Ing=E9nieur T=E9l=E9com - Futur Doctorant',
      'TEL;CELL:+33-6-24-19-44-59',
      'EMAIL;PREF:corentin@lavalcorentin.com',
      'END:VCARD'
    ];

    // Blob en ISO-8859-1 pour que Windows Contacts l’accepte
    const blob = new Blob(
      [vcardLines.join('\r\n')],
      { type: 'text/x-vcard;charset=ISO-8859-1' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Corentin_Laval.vcf';
    a.click();
    URL.revokeObjectURL(url);
  }
}
