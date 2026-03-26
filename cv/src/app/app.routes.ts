import { Routes } from '@angular/router';
import { CvpageComponent } from './cvpage/cvpage.component';
import { AuthGuard } from './auth.guard';
import { ShellComponent } from './shell/shell.component';
import {PhotosComponent} from './photos/photos.component';
import {TestComponent} from './test/test.component';
import {MemoComponent} from './memo/memo.component'; // 👈 le wrapper avec <app-side>


export const routes: Routes = [
  // Page publique
  {
    path: 'CorentinLaval',
    component: CvpageComponent
  },

  {
    path: 'Photos',
    component: PhotosComponent
  },

  {
    path: 'Test',
    component: TestComponent
  },

  {
    path: 'MEMO',
    component: MemoComponent
  },

  // Auth
  {
    path: 'login',
    loadComponent: () => import('./loggin/loggin.component').then(m => m.LogginComponent)
  },

  // Zone privée : tout est affiché sous <app-side> (ShellComponent)
  {
    path: '',
    canActivate: [AuthGuard],
    component: ShellComponent,
    children: [
      {
        path: 'menu',
        loadComponent: () => import('./menu/menu.component').then(m => m.MenuComponent)
      },
      {
        path: 'look',
        loadComponent: () => import('./look/look.component').then(m => m.LookComponent)
      },
      {
        path: 'movments',
        loadComponent: () => import('./expenseslist/expenseslist.component').then(m => m.ExpenseslistComponent)
      },
      {
        path: 'compare',
        loadComponent: () => import('./comparatif/comparatif.component').then(m => m.ComparatifComponent)
      },
      {
        path: 'plan',
        loadComponent: () => import('./plan/plan.component').then(m => m.PlanComponent)
      },
      // défaut de la zone privée
      { path: '', redirectTo: 'menu', pathMatch: 'full' },
    ]
  },

  // redirect racine -> page publique
  { path: '', redirectTo: '/CorentinLaval', pathMatch: 'full' },

  // 404
  { path: '**', redirectTo: '/CorentinLaval' }
];
