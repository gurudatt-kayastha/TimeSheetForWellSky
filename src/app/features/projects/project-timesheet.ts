import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TimesheetService, Timesheet } from '../../shared/services/timesheet';
import { ProjectService, Project } from '../../shared/services/project';
import { LoginService } from '../../shared/services/login';

@Component({
  selector: 'app-project-timesheet',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './project-timesheet.html',
  styleUrl: './project-timesheet.scss',
  providers: [TimesheetService, ProjectService, LoginService]
})
export class ProjectTimesheet implements OnInit {
  timesheets: Timesheet[] = [];
  filteredTimesheets: Timesheet[] = [];
  totalHours: number = 0;
  projectTotalHours: number = 0;
  loading: boolean = true;
  projectName: string = '';
  project: Project | null = null;
  currentUser: string = JSON.parse(localStorage.getItem('currentUser') || '{}')?.email || '';
  isEmployee: boolean = false;
  
  // Filter properties
  selectedDate: string = 'any';
  selectedStatus: string = 'any';
  selectedUser: string = 'all';
  selectedActivity: string = 'any';

  constructor(
    private timesheetService: TimesheetService,
    private projectService: ProjectService,
    private loginService: LoginService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check user role
    this.isEmployee = this.loginService.isEmployee();
    
    this.route.paramMap.subscribe(params => {
      this.projectName = decodeURIComponent(params.get('name') || '');
      if (this.projectName) {
        this.loadProjectData();
        this.loadTimesheets();
      }
    });
  }

  loadProjectData(): void {
    this.projectService.getProjectByName(this.projectName).subscribe({
      next: (project) => {
        this.project = project || null;
      },
      error: (error) => {
        console.error('Error loading project:', error);
      }
    });
  }

  loadTimesheets(): void {
    this.loading = true;
    this.timesheetService.getTimesheets().subscribe({
      next: (data) => {
        // Filter timesheets by project name and current user
        this.timesheets = data.filter(timesheet => 
          timesheet.projectName === this.projectName &&
          timesheet.user === this.currentUser
        );
        this.filteredTimesheets = [...this.timesheets];
        this.calculateTotalHours();
        this.loadProjectTotalHours();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading timesheets:', error);
        this.loading = false;
      }
    });
  }

  loadProjectTotalHours(): void {
    this.timesheetService.getTotalHoursByProject(this.projectName).subscribe({
      next: (hours) => {
        this.projectTotalHours = hours;
      },
      error: (error) => {
        console.error('Error loading project total hours:', error);
        this.projectTotalHours = 0;
      }
    });
  }

  calculateTotalHours(): void {
    this.totalHours = this.filteredTimesheets.reduce((total, timesheet) => total + timesheet.hours, 0);
  }

  getStatusClass(status: string): string {
    return status.toLowerCase() === 'approved' ? 'status-approved' : 'status-pending';
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredTimesheets = this.timesheets.filter(timesheet => {
      let matches = true;

      // Date filter
      if (this.selectedDate !== 'any') {
        const timesheetDate = new Date(timesheet.date.split('/').reverse().join('-'));
        const today = new Date();
        
        switch (this.selectedDate) {
          case 'today':
            matches = matches && this.isSameDay(timesheetDate, today);
            break;
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            matches = matches && this.isSameDay(timesheetDate, yesterday);
            break;
          case 'this-week':
            matches = matches && this.isThisWeek(timesheetDate, today);
            break;
          case 'last-week':
            matches = matches && this.isLastWeek(timesheetDate, today);
            break;
          case 'this-month':
            matches = matches && this.isSameMonth(timesheetDate, today);
            break;
        }
      }

      // Status filter
      if (this.selectedStatus !== 'any') {
        matches = matches && timesheet.approvalStatus === this.selectedStatus;
      }

      // Activity filter
      if (this.selectedActivity !== 'any') {
        matches = matches && timesheet.activity === this.selectedActivity;
      }

      // User filter
      if (this.selectedUser !== 'all') {
        matches = matches && timesheet.user === this.selectedUser;
      }

      return matches;
    });

    this.calculateTotalHours();
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  private isSameMonth(date1: Date, date2: Date): boolean {
    return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
  }

  private isThisWeek(date: Date, today: Date): boolean {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return date >= startOfWeek && date <= endOfWeek;
  }

  private isLastWeek(date: Date, today: Date): boolean {
    const startOfLastWeek = new Date(today);
    startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
    return date >= startOfLastWeek && date <= endOfLastWeek;
  }

  onApplyFilter(): void {
    this.applyFilters();
  }

  onClearFilter(): void {
    this.selectedDate = 'any';
    this.selectedStatus = 'any';
    this.selectedUser = 'all';
    this.selectedActivity = 'any';
    this.filteredTimesheets = [...this.timesheets];
    this.calculateTotalHours();
  }

  onLogTime(): void {
  this.router.navigate(['/project', encodeURIComponent(this.projectName), 'log-time']);
  }

  onEditTimesheet(timesheet: Timesheet): void {
    // Implementation for editing timesheet entry
    console.log('Edit timesheet:', timesheet);
    // TODO: Open edit modal or navigate to edit page
  }

  onDeleteTimesheet(timesheet: Timesheet): void {
    // Implementation for deleting timesheet entry
    if (confirm(`Are you sure you want to delete this timesheet entry from ${timesheet.date}?`)) {
      this.timesheetService.deleteTimesheet(timesheet.id).subscribe({
        next: () => {
          // Remove from local arrays
          this.timesheets = this.timesheets.filter(t => t.id !== timesheet.id);
          this.filteredTimesheets = this.filteredTimesheets.filter(t => t.id !== timesheet.id);
          this.calculateTotalHours();
          this.loadProjectTotalHours();
          console.log('Timesheet deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting timesheet:', error);
          alert('Error deleting timesheet entry. Please try again.');
        }
      });
    }
  }

  goBackToProjects(): void {
    this.router.navigate(['/projects']);
  }
}