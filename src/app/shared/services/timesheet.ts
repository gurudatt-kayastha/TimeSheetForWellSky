import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

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
    return this.http.get<Timesheet[]>(this.apiUrl).pipe(
      switchMap(timesheets => {
        // Find the highest numeric ID
        const maxId = timesheets.reduce((max, ts) => {
          const numId = parseInt(ts.id);
          return !isNaN(numId) && numId > max ? numId : max;
        }, 0);
        
        // Generate next sequential ID
        const newId = String(maxId + 1);
        
        const newTimesheet: Timesheet = {
          ...timesheet,
          id: newId
        };
        
        return this.http.post<Timesheet>(this.apiUrl, newTimesheet);
      })
    );
  }

  updateTimesheet(id: string, updatedData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, updatedData);
  }

  deleteTimesheet(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}