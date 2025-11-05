import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Timesheet {
  id: string;
  date: string;
  user: string;
  activity: string;
  issue: string;
  comment: string;
  hours: number;
  approvalStatus: string;
  created: string;
  unit: string;
  author: string;
  projectId: string;
  projectName: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimesheetService {
  private apiUrl = 'http://localhost:3000/timesheets';

  constructor(private http: HttpClient) { }

  getTimesheets(): Observable<Timesheet[]> {
    return this.http.get<Timesheet[]>(this.apiUrl);
  }

  getTimesheetById(id: string): Observable<Timesheet> {
    return this.http.get<Timesheet>(`${this.apiUrl}/${id}`);
  }

  getTimesheetsByProject(projectName: string): Observable<Timesheet[]> {
    return this.http.get<Timesheet[]>(this.apiUrl).pipe(
      map(timesheets => timesheets.filter(timesheet => 
        timesheet.projectName === projectName
      ))
    );
  }

  getTimesheetsByUser(userEmail: string): Observable<Timesheet[]> {
    return this.http.get<Timesheet[]>(this.apiUrl).pipe(
      map(timesheets => timesheets.filter(timesheet => 
        timesheet.user === userEmail
      ))
    );
  }

  getTotalHoursByProject(projectName: string): Observable<number> {
    return this.getTimesheetsByProject(projectName).pipe(
      map(timesheets => timesheets.reduce((total, timesheet) => total + timesheet.hours, 0))
    );
  }

  getTotalHoursByProjectForUser(projectName: string, userEmail: string): Observable<number> {
    return this.http.get<Timesheet[]>(this.apiUrl).pipe(
      map(timesheets => timesheets
        .filter(timesheet => 
          timesheet.projectName === projectName && 
          timesheet.user === userEmail
        )
        .reduce((total, timesheet) => total + timesheet.hours, 0)
      )
    );
  }

  createTimesheet(timesheet: Omit<Timesheet, 'id'>): Observable<Timesheet> {
    return this.http.post<Timesheet>(this.apiUrl, timesheet);
  }

  updateTimesheet(id: string, timesheet: Partial<Timesheet>): Observable<Timesheet> {
    return this.http.put<Timesheet>(`${this.apiUrl}/${id}`, timesheet);
  }

  deleteTimesheet(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}