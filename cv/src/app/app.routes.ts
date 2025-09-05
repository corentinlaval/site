import { Routes } from '@angular/router';
import { CvpageComponent } from './cvpage/cvpage.component';
import { AuthGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: 'CorentinLaval',
    component: CvpageComponent
  },
  {
    path: 'login',
    loadComponent: () => import('./loggin/loggin.component').then(m => m.LogginComponent)
  },
  {
    path: 'look',
    canActivate: [AuthGuard],
    loadComponent: () => import('./look/look.component').then(m => m.LookComponent)
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
