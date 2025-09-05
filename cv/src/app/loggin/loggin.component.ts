import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-loggin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './loggin.component.html',
  styleUrls: ['./loggin.component.css']
})
export class LogginComponent {
  form: FormGroup;
  loading = false;
  errorMsg = '';
  private show = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]], // ⚠️ Firebase attend un email ici
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  // Getters pour simplifier l'accès dans le template
  get username() {
    return this.form.get('username');
  }

  get password() {
    return this.form.get('password');
  }

  showPassword() {
    return this.show;
  }

  toggleShow() {
    this.show = !this.show;
  }

  async submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';

    try {
      // Ici "username" doit être un email que tu as créé dans Firebase
      await this.auth.login(this.username?.value, this.password?.value);
      this.router.navigate(['/look']);
    } catch (err: any) {
      this.errorMsg = err.message || 'Connexion échouée';
    } finally {
      this.loading = false;
    }
  }
}
