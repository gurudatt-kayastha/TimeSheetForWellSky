import { Component, Injectable, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbDatepickerModule, NgbDateStruct, NgbCalendar, NgbDate, NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TimesheetService, Timesheet } from '../../shared/services/timesheet';
import { ProjectService, Project } from '../../shared/services/project';
import { LoginService, User } from '../../shared/services/login';
import { Subject, takeUntil, finalize } from 'rxjs';

@Injectable()
export class CustomDateFormatter extends NgbDateParserFormatter {
  parse(value: string): NgbDateStruct | null {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length === 3) {
      return {
        day: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        year: parseInt(parts[2], 10)
      };
    }
    return null;
  }

  format(date: NgbDateStruct | null): string {
    if (!date) return '';
    return `${String(date.day).padStart(2, '0')}-${String(date.month).padStart(2, '0')}-${date.year}`;
  }
}

@Component({
  selector: 'app-log-time',
  imports: [CommonModule, FormsModule, HttpClientModule, NgbDatepickerModule],
  templateUrl: './log-time.html',
  styleUrl: './log-time.scss',
  providers: [
    TimesheetService, 
    ProjectService, 
    LoginService, 
    { provide: NgbDateParserFormatter, useClass: CustomDateFormatter }
  ]
})
export class LogTime implements OnInit, OnDestroy {
  projectName: string = '';
  project: Project | null = null;
  currentUser: User | null = null;
  
  // Form fields
  selectedDate: NgbDateStruct | null = null;
  selectedActivity: string = '';
  hours: number | null = null;
  issue: string = '';
  
  // Validation states
  dateError: string = '';
  activityError: string = '';
  hoursError: string = '';
  issueError: string = '';
  
  activities: string[] = ['Task', 'Holiday', 'Leave', 'Interview'];
  
  // Date restrictions for ng-bootstrap
  minDateStruct: NgbDateStruct | undefined = undefined;
  maxDateStruct: NgbDateStruct | undefined = undefined;
  
  loading: boolean = true;
  submitting: boolean = false; // NEW: Prevent double submissions

  // Edit Button 
  isEditMode: boolean = false;
  editId: string | null = null;

  // NEW: For unsubscribing from observables
  private destroy$ = new Subject<void>();

  // Constants
  private readonly MAX_HOURS_PER_DAY = 9;
  private readonly MIN_ISSUE_LENGTH = 10;
  private readonly MAX_ISSUE_LENGTH = 500;
  private readonly BUSINESS_DAYS_LOOKBACK = 4; // 5 days including today

  constructor(
    private timesheetService: TimesheetService,
    private projectService: ProjectService,
    private loginService: LoginService,
    private route: ActivatedRoute,
    private router: Router,
    private calendar: NgbCalendar,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Get current user from localStorage
    this.currentUser = this.loginService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Get project name from route
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.projectName = decodeURIComponent(params.get('name') || '');
        const idParam = params.get('id');

        // Detect edit mode
        if (idParam) {
          this.isEditMode = true;
          this.editId = idParam;
        }

        if (this.projectName) {
          this.loadProjectData();
        }
        
        // Load record if in edit mode
        if (this.isEditMode && this.editId) {
          this.loadTimesheetForEdit(this.editId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTimesheetForEdit(id: string): void {
    this.timesheetService.getTimesheetById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (record) => {
          if (record) {
            // Fill form fields with existing record
            const [day, month, year] = record.date.split('/').map(Number);
            this.selectedDate = { day, month, year };
            this.selectedActivity = record.activity;
            this.hours = record.hours;
            this.issue = record.issue;
          }
        },
        error: (err) => {
          console.error('Error loading timesheet for edit:', err);
          this.toastr.error('Failed to load timesheet record', 'Error');
          this.router.navigate(['/project', encodeURIComponent(this.projectName)]);
        }
      });
  }

  loadProjectData(): void {
    this.loading = true;
    this.projectService.getProjectByName(this.projectName)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (project) => {
          this.project = project || null;
          if (this.project) {
            this.setupDateRestrictions();
          } else {
            this.toastr.error('Project not found', 'Error');
            this.router.navigate(['/']);
          }
        },
        error: (error) => {
          console.error('Error loading project:', error);
          this.toastr.error('Failed to load project information', 'Error');
          this.router.navigate(['/']);
        }
      });
  }

  setupDateRestrictions(): void {
    if (!this.project) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Parse project start and end dates (format: DD-MM-YYYY)
      const projectStartDate = this.parseProjectDate(this.project.startDate);
      const projectEndDate = this.parseProjectDate(this.project.endDate);

      // Calculate 5 business days including today (so go back 4 days)
      const fiveBusinessDaysAgo = this.calculateBusinessDaysAgo(today, this.BUSINESS_DAYS_LOOKBACK);

      // Max date is today or project end date, whichever is earlier
      const maxDateValue = today < projectEndDate ? today : projectEndDate;
      
      // Min date is the later of: project start date or 5 business days ago
      const minDateValue = projectStartDate > fiveBusinessDaysAgo ? projectStartDate : fiveBusinessDaysAgo;

      this.minDateStruct = this.dateToNgbDate(minDateValue);
      this.maxDateStruct = this.dateToNgbDate(maxDateValue);
    } catch (error) {
      console.error('Error parsing project dates:', error);
      this.toastr.error('Invalid project date format', 'Error');
    }
  }

  // NEW: Separate method for parsing project dates
  private parseProjectDate(dateStr: string): Date {
    const [day, month, year] = dateStr.trim().split('-').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    return new Date(year, month - 1, day);
  }

  calculateBusinessDaysAgo(fromDate: Date, businessDays: number): Date {
    const result = new Date(fromDate);
    let daysToSubtract = 0;
    let businessDaysCount = 0;

    while (businessDaysCount < businessDays) {
      daysToSubtract++;
      const checkDate = new Date(fromDate);
      checkDate.setDate(fromDate.getDate() - daysToSubtract);
      
      // Check if it's a weekend (0 = Sunday, 6 = Saturday)
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDaysCount++;
      }
    }

    result.setDate(fromDate.getDate() - daysToSubtract);
    return result;
  }

  // Disable weekends in the datepicker
  isDisabled = (date: NgbDate, current?: { year: number; month: number }): boolean => {
    const jsDate = new Date(date.year, date.month - 1, date.day);
    const dayOfWeek = jsDate.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  dateToNgbDate(date: Date): NgbDateStruct {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    };
  }

  ngbDateToDate(ngbDate: NgbDateStruct): Date {
    return new Date(ngbDate.year, ngbDate.month - 1, ngbDate.day);
  }

  formatDateForStorage(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatDateTimeForStorage(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Simplified: 0 becomes 12
    const hoursStr = String(hours).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm}`;
  }

  onDateChange(): void {
    if (!this.selectedDate) {
      this.dateError = 'Date is required';
      return;
    }

    const jsDate = this.ngbDateToDate(this.selectedDate);
    const dayOfWeek = jsDate.getDay();
    
    // Check if it's a weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      this.dateError = 'Weekends are not allowed';
      this.selectedDate = null;
      return;
    }

    // Clear error if valid
    this.dateError = '';
    
    // Clear hours error if date changes (user might need to re-validate)
    if (this.hoursError && this.hoursError.includes('Total hours')) {
      this.hoursError = '';
    }
  }

  // NEW: Validate hours on blur to check daily limit
  async onHoursBlur(): Promise<void> {
    if (this.hours !== null && this.hours !== undefined && this.selectedDate) {
      await this.checkDailyHoursLimit();
    }
  }

  validateForm(): boolean {
    let isValid = true;

    // Validate date
    if (!this.selectedDate) {
      this.dateError = 'Date is required';
      isValid = false;
    } else {
      this.dateError = '';
    }

    // Validate activity
    if (!this.selectedActivity) {
      this.activityError = 'Activity is required';
      isValid = false;
    } else {
      this.activityError = '';
    }

    // Validate hours
    if (this.hours === null || this.hours === undefined) {
      this.hoursError = 'Hours is required';
      isValid = false;
    } else if (this.hours <= 0) {
      this.hoursError = 'Hours must be greater than 0';
      isValid = false;
    } else if (this.hours > this.MAX_HOURS_PER_DAY) {
      this.hoursError = `Hours cannot exceed ${this.MAX_HOURS_PER_DAY}`;
      isValid = false;
    } else if (!Number.isInteger(this.hours)) {
      this.hoursError = 'Hours must be a whole number';
      isValid = false;
    } else {
      this.hoursError = '';
    }

    // Validate issue
    const trimmedIssue = this.issue?.trim() || '';
    if (!trimmedIssue) {
      this.issueError = 'Issue description is required';
      isValid = false;
    } else if (trimmedIssue.length < this.MIN_ISSUE_LENGTH) {
      this.issueError = `Issue description must be at least ${this.MIN_ISSUE_LENGTH} characters`;
      isValid = false;
    } else if (trimmedIssue.length > this.MAX_ISSUE_LENGTH) {
      this.issueError = `Issue description cannot exceed ${this.MAX_ISSUE_LENGTH} characters`;
      isValid = false;
    } else {
      this.issueError = '';
    }

    return isValid;
  }

  async checkDailyHoursLimit(): Promise<boolean> {
    if (!this.currentUser || !this.selectedDate || !this.hours) {
      return false;
    }

    const selectedJsDate = this.ngbDateToDate(this.selectedDate);
    const dateString = this.formatDateForStorage(selectedJsDate);

    return new Promise((resolve) => {
      this.timesheetService.getTimesheets()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (timesheets) => {
            // Filter timesheets for same user and same date, excluding current record in edit mode
            const existingTimesheets = timesheets.filter(ts => 
              ts.user === this.currentUser!.email && 
              ts.date === dateString &&
              (!this.isEditMode || ts.id !== this.editId)
            );

            const totalExistingHours = existingTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
            const totalHours = totalExistingHours + (this.hours || 0);
            
            if (totalHours > this.MAX_HOURS_PER_DAY) {
              this.hoursError = `Total hours for this day would be ${totalHours}. Maximum allowed is ${this.MAX_HOURS_PER_DAY} hours per day. You already have ${totalExistingHours} hours logged.`;
              resolve(false);
            } else {
              // Clear error if it was previously set
              if (this.hoursError && this.hoursError.includes('Total hours')) {
                this.hoursError = '';
              }
              resolve(true);
            }
          },
          error: (error) => {
            console.error('Error checking daily hours:', error);
            this.hoursError = 'Error validating daily hours limit';
            resolve(false);
          }
        });
    });
  }

  async onSubmit(addAnother: boolean = false): Promise<void> {
    // Prevent double submission
    if (this.submitting) {
      return;
    }

    if (!this.validateForm() || !this.currentUser || !this.project || !this.selectedDate) {
      return;
    }

    // Check daily hours limit for both create and edit
    const isWithinLimit = await this.checkDailyHoursLimit();
    if (!isWithinLimit) {
      return;
    }

    this.submitting = true;
    const selectedJsDate = this.ngbDateToDate(this.selectedDate);
    const now = new Date();

    const timesheetData: Omit<Timesheet, 'id'> = {
      date: this.formatDateForStorage(selectedJsDate),
      user: this.currentUser.email,
      activity: this.selectedActivity,
      issue: this.issue.trim(),
      comment: '',
      hours: this.hours!,
      approvalStatus: 'Pending',
      created: this.formatDateTimeForStorage(now),
      unit: 'Unit 2',
      author: this.currentUser.email,
      projectId: this.project.id,
      projectName: this.project.name
    };

    const operation$ = this.isEditMode && this.editId
      ? this.timesheetService.updateTimesheet(this.editId, timesheetData)
      : this.timesheetService.createTimesheet(timesheetData);

    operation$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.submitting = false)
      )
      .subscribe({
        next: () => {
          const message = this.isEditMode ? 'Time entry updated successfully!' : 'Time entry created successfully!';
          this.toastr.success(message, 'Success', {
            timeOut: 3000,
            progressBar: true,
            closeButton: true
          });
          
          if (addAnother && !this.isEditMode) {
            setTimeout(() => this.clearForm(), 500);
          } else {
            setTimeout(() => {
              this.router.navigate(['/project', encodeURIComponent(this.projectName)]);
            }, 500);
          }
        },
        error: (error) => {
          console.error('Error saving timesheet:', error);
          const message = this.isEditMode ? 'Failed to update time entry' : 'Failed to create time entry';
          this.toastr.error(`${message}. Please try again.`, 'Error', {
            timeOut: 3000,
            progressBar: true,
            closeButton: true
          });
        }
      });
  }

  onCreate(): void {
    this.onSubmit(false);
  }

  onCreateAndAddAnother(): void {
    this.onSubmit(true);
  }

  clearForm(): void {
    this.selectedDate = null;
    this.selectedActivity = '';
    this.hours = null;
    this.issue = '';
    this.dateError = '';
    this.activityError = '';
    this.hoursError = '';
    this.issueError = '';
  }

  onCancel(): void {
    this.router.navigate(['/project', encodeURIComponent(this.projectName)]);
  }

  goBackToProject(): void {
    this.router.navigate(['/project', encodeURIComponent(this.projectName)]);
  }
}