import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
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

interface UserMinimal {
  email: string;
  reportingManager?: string;
}

interface ProjectMinimal {
  name: string;
  assignedUsers?: string[];
  projectManager?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimesheetService {
  private apiUrl = 'http://localhost:3000/timesheets';
  private usersUrl = 'http://localhost:3000/users';
  private projectsUrl = 'http://localhost:3000/projects';

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

  /**
   * For admin: calculate total hours for a project by summing hours from:
   *  - users whose reportingManager === adminEmail
   *  - users explicitly assigned to the project
   */
  getTotalHoursByProjectForAdmin(projectName: string, adminEmail: string): Observable<number> {
    return forkJoin({
      timesheets: this.getTimesheetsByProject(projectName),
      users: this.http.get<UserMinimal[]>(this.usersUrl),
      projects: this.http.get<ProjectMinimal[]>(this.projectsUrl)
    }).pipe(
      map(({ timesheets, users, projects }) => {
        // Users reporting to admin
        const managedEmails = new Set(
          users
            .filter(u => !!u.reportingManager && u.reportingManager === adminEmail)
            .map(u => u.email)
        );

        // Project assigned users (find by project name)
        const project = projects.find(p => p.name === projectName);
        const assignedEmails = new Set<string>(project?.assignedUsers || []);

        // Combine both sets
        const includeEmails = new Set<string>([...managedEmails, ...assignedEmails]);

        // Sum timesheet hours for included users
        const total = timesheets.reduce((sum, ts) => {
          return includeEmails.has(ts.user) ? sum + (ts.hours || 0) : sum;
        }, 0);

        return total;
      })
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