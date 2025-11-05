import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ProjectService, Project } from '../../shared/services/project';
import { TimesheetService } from '../../shared/services/timesheet';
import { forkJoin } from 'rxjs';

export interface ProjectWithHours extends Project {
  totalHours: number;
}

@Component({
  selector: 'app-projects',
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  providers: [ProjectService, TimesheetService]
})
export class Projects implements OnInit {
  projects: ProjectWithHours[] = [];
  loading: boolean = true;
  currentUser: string = 'nehal.patel@nitorinfotech.com'; // This should come from auth service

  constructor(
    private projectService: ProjectService,
    private timesheetService: TimesheetService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.projectService.getProjectsForUser(this.currentUser).subscribe({
      next: (projects) => {
        // Load total hours for each project
        const hourRequests = projects.map(project => 
          this.timesheetService.getTotalHoursByProjectForUser(project.name, this.currentUser)
        );

        if (hourRequests.length > 0) {
          forkJoin(hourRequests).subscribe({
            next: (hoursArray) => {
              this.projects = projects.map((project, index) => ({
                ...project,
                totalHours: hoursArray[index]
              }));
              this.loading = false;
            },
            error: (error) => {
              console.error('Error loading project hours:', error);
              // Set projects without hours if hours loading fails
              this.projects = projects.map(project => ({
                ...project,
                totalHours: 0
              }));
              this.loading = false;
            }
          });
        } else {
          this.projects = [];
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.loading = false;
      }
    });
  }

  getProjectUrl(projectName: string): string {
    return `/project/${encodeURIComponent(projectName)}`;
  }

  getStatusClass(status: string): string {
    return status.toLowerCase() === 'active' ? 'status-active' : 'status-inactive';
  }
}