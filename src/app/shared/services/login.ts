import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private apiUrl = 'http://localhost:3000/users'; // JSON Server URL

  constructor(private http: HttpClient) { }
  public login(username: string, password: string): Observable<boolean> {
    return this.http
      .get<any[]>(`${this.apiUrl}?username=${username}&password=${password}`)
      .pipe(map(users => users.length > 0));
  }
}
