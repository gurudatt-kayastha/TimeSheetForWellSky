import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  assignedUsers: string[];
  startDate: string;
  endDate: string;
  projectManager: string;
  totalHours?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = 'http://localhost:3000/projects';

  constructor(private http: HttpClient) { }

  getAllProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  getProjectsForUser(userEmail: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}`).pipe(
      map(projects => projects.filter(project => 
        // Show project if user is either assigned OR is the project manager
        project.assignedUsers.includes(userEmail) || 
        project.projectManager === userEmail
      ))
    );
  }

  getProjectById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`);
  }

  getProjectByName(name: string): Observable<Project | undefined> {
    return this.http.get<Project[]>(this.apiUrl).pipe(
      map(projects => projects.find(project => 
        project.name.toLowerCase() === name.toLowerCase()
      ))
    );
  }

  createProject(project: Omit<Project, 'id'>): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, project);
  }

  updateProject(id: string, project: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${id}`, project);
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}