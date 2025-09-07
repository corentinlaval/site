import {ApplicationConfig, LOCALE_ID, provideZoneChangeDetection} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),

    // Initialise Firebase App
    provideFirebaseApp(() =>
      initializeApp({
        apiKey: "AIzaSyDu9yQYA20eCznerxPwQSrAgK6JfgyP6Dc",
        authDomain: "cv-corentinlaval.firebaseapp.com",
        projectId: "cv-corentinlaval",
        storageBucket: "cv-corentinlaval.firebasestorage.app",
        messagingSenderId: "930929562631",
        appId: "1:930929562631:web:8c2e3269da4fd0c79146a2",
        measurementId: "G-VH76VRSLJ8"
      })
    ),

    // Fournit Auth et Firestore
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    { provide: LOCALE_ID, useValue: 'fr-FR' }
  ]
};
