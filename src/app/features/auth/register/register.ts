import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RegisterService } from '../../../shared/services/register';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})

export class Register {
  registerForm!: FormGroup;
  submitted = false;
  maxDate = new Date().toISOString().split('T')[0];
  minDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'de', name: 'German' },
    { code: 'hi', name: 'Hindi' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private registerService: RegisterService
  ) { }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      login: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmation: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      language: ['', Validators.required],
      employeeId: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]+$/)]],
      dateOfJoining: ['', Validators.required],
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // convenience getter for easy access to form fields
  get f(): { [key: string]: AbstractControl } {
    return this.registerForm.controls;
  }

  // Custom validator for password match
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirm = form.get('confirmation')?.value;
    if (password !== confirm) {
      form.get('confirmation')?.setErrors({ mismatch: true });
    } else {
      form.get('confirmation')?.setErrors(null);
    }
    return null;
  }

  public onSubmit(): void {
    debugger
    this.submitted = true;

    if (this.registerForm.invalid) {
      return;
    }

    const newUser = {
      login: this.registerForm.value.login,
      password: this.registerForm.value.password,
      firstName: this.registerForm.value.firstName,
      lastName: this.registerForm.value.lastName,
      middleName: this.registerForm.value.middleName,
      email: this.registerForm.value.email,
      language: this.registerForm.value.language,
      employeeId: this.registerForm.value.employeeId,
      dateOfJoining: this.registerForm.value.dateOfJoining
    };

    this.registerService.registerUser(newUser).subscribe({
      next: (res) => {
        console.log('User registered successfully:', res);
        this.router.navigate(['/login']); // redirect after registration
      },
      error: (err) => {
        console.error('Registration error:', err);
      }
    });
  }
}
