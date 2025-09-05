import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { authState } from 'rxfire/auth'; // 👈 important avec AngularFire 19
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private auth = inject(Auth);
  private router = inject(Router);

  async canActivate(): Promise<boolean | UrlTree> {
    const user = await firstValueFrom(authState(this.auth));
    return user ? true : this.router.parseUrl('/login');
  }
}
