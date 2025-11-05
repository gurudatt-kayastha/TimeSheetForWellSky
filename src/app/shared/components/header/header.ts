import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { LoginService } from '../../services/login';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  providers: [LoginService]
})
export class Header {
  showAuthButtons: boolean = true;
  showlogoutButton: boolean = false;
  currentRoute: string = '';
  
  constructor(
    private router: Router,
    private loginService: LoginService
  ) {
    this.currentRoute = this.router.url;
    
    // Watch for route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.url;
        this.updateButtonVisibility(event.url);
      });
  }

  private updateButtonVisibility(url: string): void {
    this.showAuthButtons = url.includes('login') || url.includes('register');
    this.showlogoutButton = !url.includes('login') && !url.includes('register');
  }

  isActive(route: string): boolean {
    console.log('Checking route:', route, 'Current route:', this.currentRoute);
    
    if (route === '/projects') {
      // Handle projects route and all sub-routes (both /projects/ and /project/)
      const isProjectsActive = this.currentRoute === '/projects' || 
                               this.currentRoute.startsWith('/projects/') ||
                               this.currentRoute.startsWith('/project/');
      console.log('Projects active:', isProjectsActive);
      return isProjectsActive;
    }
    if (route.endsWith('/*')) {
      // Handle wildcard routes like '/projects/*'
      const baseRoute = route.slice(0, -2); // Remove '/*'
      return this.currentRoute === baseRoute || this.currentRoute.startsWith(baseRoute + '/');
    }
    return this.currentRoute === route;
  }

  get isProjectsActive(): boolean {
    return this.currentRoute === '/projects' || 
           this.currentRoute.startsWith('/projects/') ||
           this.currentRoute.startsWith('/project/');
  }

  logout(): void {
    // Use LoginService to properly clear user data
    this.loginService.logout();
    
    // Navigate to login page
    this.router.navigate(['/login']);
  }
}
