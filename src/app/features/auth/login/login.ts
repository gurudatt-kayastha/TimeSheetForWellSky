import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LoginService } from '../../../shared/services/login';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  loginForm!: FormGroup;
  submitted = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loginService: LoginService
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.loginForm.invalid) {
      return;
    }

    const { username, password } = this.loginForm.value;

    this.loginService.login(username, password).subscribe({
      next: (isValid) => {
        if (isValid) {
          this.router.navigate(['/projects']);
        }
        else {
          this.errorMessage = 'Invalid username or password';

        }
      },
      error: (err) => {
        this.errorMessage = 'Server error, please try again later.';
      },
      complete: () => { }
    });

    console.log('Form submitted successfully:', this.loginForm.value);
  }
}
