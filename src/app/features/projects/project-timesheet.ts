import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { filter } from 'rxjs/operators';
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
  selectedUnit: string = 'any';

  // Bulk delete properties
  selectedTimesheets: Set<string> = new Set();
  selectAll: boolean = false;

  // Delete dialog properties
  showDeleteDialog = false;
  timesheetToDelete: Timesheet | null = null;
  showBulkDeleteDialog = false;

  constructor(
    private timesheetService: TimesheetService,
    private projectService: ProjectService,
    private loginService: LoginService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.isEmployee = this.loginService.isEmployee();
    
    this.route.paramMap.subscribe(params => {
      this.projectName = decodeURIComponent(params.get('name') || '');
      if (this.projectName) {
        this.loadProjectData();
        this.loadTimesheets();
      }
    });

    // Reload timesheets when navigating back from edit/create
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.router.url.includes('/project/') && !this.router.url.includes('/log-time')) {
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
        this.timesheets = data.filter(timesheet => 
          timesheet.projectName === this.projectName &&
          timesheet.user === this.currentUser
        );
        this.filteredTimesheets = [...this.timesheets];
        this.applyFilters();
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

      if (this.selectedStatus !== 'any') {
        matches = matches && timesheet.approvalStatus === this.selectedStatus;
      }

      if (this.selectedActivity !== 'any') {
        matches = matches && timesheet.activity === this.selectedActivity;
      }

      if (this.selectedUser !== 'all') {
        matches = matches && timesheet.user === this.selectedUser;
      }

      if (this.selectedUnit !== 'any') {
        matches = matches && timesheet.unit?.toLowerCase() === this.selectedUnit.toLowerCase();
      }

      return matches;
    });

    this.calculateTotalHours();
    this.clearSelections();
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
    this.selectedUnit = 'any';
    this.filteredTimesheets = [...this.timesheets];
    this.calculateTotalHours();
    this.clearSelections();
  }

  toggleSelectAll(event: any): void {
    this.selectAll = event.target.checked;
    this.selectedTimesheets.clear();
    
    if (this.selectAll) {
      this.filteredTimesheets.forEach(timesheet => {
        this.selectedTimesheets.add(timesheet.id);
      });
    }
  }

  toggleSelectTimesheet(timesheetId: string, event: any): void {
    if (event.target.checked) {
      this.selectedTimesheets.add(timesheetId);
    } else {
      this.selectedTimesheets.delete(timesheetId);
      this.selectAll = false;
    }
  }

  isTimesheetSelected(timesheetId: string): boolean {
    return this.selectedTimesheets.has(timesheetId);
  }

  getSelectedCount(): number {
    return this.selectedTimesheets.size;
  }

  clearSelections(): void {
    this.selectedTimesheets.clear();
    this.selectAll = false;
  }

  onBulkDelete(): void {
    if (this.selectedTimesheets.size === 0) {
      return;
    }

    const selectedTimesheetsArray = this.filteredTimesheets.filter(t => 
      this.selectedTimesheets.has(t.id)
    );
    
    const approvedTimesheets = selectedTimesheetsArray.filter(t => 
      t.approvalStatus.toLowerCase() === 'approved'
    );

    if (approvedTimesheets.length > 0) {
      this.toastr.warning(
        `Cannot delete ${approvedTimesheets.length} approved timesheet entries. Only pending entries can be deleted.`,
        'Cannot Delete',
        { timeOut: 4000 }
      );
      return;
    }

    this.showBulkDeleteDialog = true;
  }

  cancelBulkDelete(): void {
    this.showBulkDeleteDialog = false;
  }

  async deleteBulkTimesheets(): Promise<void> {
    const deletePromises = Array.from(this.selectedTimesheets).map(id =>
      this.timesheetService.deleteTimesheet(id).toPromise()
    );

    try {
      await Promise.all(deletePromises);
      
      const count = this.selectedTimesheets.size;
      this.clearSelections();
      this.showBulkDeleteDialog = false;

      this.toastr.success(
        `Successfully deleted ${count} timesheet ${count === 1 ? 'entry' : 'entries'}`,
        'Success',
        { timeOut: 3000, progressBar: true }
      );

      this.loadTimesheets();
    } catch (error) {
      console.error('Error deleting timesheets:', error);
      this.showBulkDeleteDialog = false;
      this.toastr.error('Failed to delete timesheet entries. Please try again.', 'Error', {
        timeOut: 3000,
        progressBar: true
      });
    }
  }

  onLogTime(): void {
    this.router.navigate(['/project', encodeURIComponent(this.projectName), 'log-time']);
  }

  onEditTimesheet(timesheet: Timesheet): void {
    this.router.navigate([
      '/project',
      encodeURIComponent(this.projectName),
      'log-time',
      timesheet.id
    ]);
  }

  confirmDeleteTimesheet(timesheet: Timesheet): void {
    if (timesheet.approvalStatus.toLowerCase() === 'approved') {
      this.toastr.warning(
        'Cannot delete an approved timesheet entry. Only pending entries can be deleted.',
        'Cannot Delete',
        { timeOut: 4000 }
      );
      return;
    }

    this.timesheetToDelete = timesheet;
    this.showDeleteDialog = true;
  }

  cancelDelete(): void {
    this.timesheetToDelete = null;
    this.showDeleteDialog = false;
  }

  deleteTimesheet(): void {
    if (!this.timesheetToDelete) {
      return;
    }

    this.timesheetService.deleteTimesheet(this.timesheetToDelete.id).subscribe({
      next: () => {
        this.toastr.success('Timesheet entry deleted successfully', 'Success', {
          timeOut: 3000,
          progressBar: true
        });

        this.cancelDelete();
        this.loadTimesheets();
      },
      error: (error) => {
        console.error('Error deleting timesheet:', error);
        this.cancelDelete();
        this.toastr.error('Error deleting timesheet entry. Please try again.', 'Error', {
          timeOut: 3000,
          progressBar: true
        });
      }
    });
  }

  goBackToProjects(): void {
    this.router.navigate(['/projects']);
  }
}