import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface User {
  id: string;
  login: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  language: string;
  employeeId: string;
  dateOfJoining: string;
}

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private apiUrl = 'http://localhost:3000/users'; // JSON Server URL
  private currentUser: User | null = null;

  constructor(private http: HttpClient) { }
  
  public login(username: string, password: string): Observable<boolean> {
    return this.http
      .get<User[]>(`${this.apiUrl}?login=${username}&password=${password}`)
      .pipe(map(users => {
        if (users.length > 0) {
          this.currentUser = users[0];
          localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          return true;
        }
        return false;
      }));
  }

  public getCurrentUser(): User | null {
    if (!this.currentUser) {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    }
    return this.currentUser;
  }

  public getUserRole(): string {
    const user = this.getCurrentUser();
    return user ? user.role : '';
  }

  public isEmployee(): boolean {
    return this.getUserRole() === 'Employee';
  }

  public logout(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }
}
