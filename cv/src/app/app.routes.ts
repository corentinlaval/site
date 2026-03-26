import { Routes } from '@angular/router';
import { CvpageComponent } from './cvpage/cvpage.component';
import { AuthGuard } from './auth.guard';
import { ShellComponent } from './shell/shell.component';
import { PhotosComponent } from './photos/photos.component';
import { TestComponent } from './test/test.component';
import { MemoComponent } from './memo/memo.component';

export const routes: Routes = [
  {
    path: '',
    component: CvpageComponent
  },
  {
    path: 'photos',
    component: PhotosComponent
  },
  {
    path: 'memo',
    component: MemoComponent
  },
  {
    path: 'login',
    loadComponent: () => import('./loggin/loggin.component').then(m => m.LogginComponent)
  },
  {
    path: 'app',
    canActivate: [AuthGuard],
    component: ShellComponent,
    children: [
      { path: 'menu', loadComponent: () => import('./menu/menu.component').then(m => m.MenuComponent) },
      { path: 'look', loadComponent: () => import('./look/look.component').then(m => m.LookComponent) },
      { path: 'movements', loadComponent: () => import('./expenseslist/expenseslist.component').then(m => m.ExpenseslistComponent) },
      { path: 'compare', loadComponent: () => import('./comparatif/comparatif.component').then(m => m.ComparatifComponent) },
      { path: 'plan', loadComponent: () => import('./plan/plan.component').then(m => m.PlanComponent) },
      { path: '', redirectTo: 'menu', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];
