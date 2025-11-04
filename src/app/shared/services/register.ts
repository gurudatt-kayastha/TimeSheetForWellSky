import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RegisterService {

  private apiUrl = 'http://localhost:3000/users'; // JSON Server endpoint

  constructor(private http: HttpClient) { }

  // Add new user
  public registerUser(user: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, user);
  }
}
