import { Routes } from '@angular/router';
import { CvpageComponent } from './cvpage/cvpage.component';

export const routes: Routes = [
  {
    path: 'CorentinLaval',
    component: CvpageComponent
  },
  {
    path: '',
    redirectTo: '/CorentinLaval',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/CorentinLaval'
  }
];
