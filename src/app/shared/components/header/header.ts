import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  showAuthButtons: boolean = true;
  showlogoutButton: boolean = false;
  constructor(
    private router: Router
  ) {

    // Watch for route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateButtonVisibility(event.url);
      });
  }

  private updateButtonVisibility(url: string): void {
    debugger
    // Show buttons if URL includes "login" or "register"
    this.showAuthButtons =
      url.includes('login');

    this.showlogoutButton = !url.includes('login') && !url.includes('register');
  }
}
