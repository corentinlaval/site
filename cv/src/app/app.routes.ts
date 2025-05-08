import { Routes } from '@angular/router';
import { CvpageComponent } from './cvpage/cvpage.component';

export const routes: Routes = [
  {
    path: 'cv',
    component: CvpageComponent
  },
  {
    path: '',
    redirectTo: '/cv',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/cv'
  }
];
