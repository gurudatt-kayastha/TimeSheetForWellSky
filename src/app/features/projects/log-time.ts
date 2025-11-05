import { Component, Injectable, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbDatepickerModule, NgbDateStruct, NgbCalendar, NgbDate, NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import { TimesheetService, Timesheet } from '../../shared/services/timesheet';
import { ProjectService, Project } from '../../shared/services/project';
import { LoginService, User } from '../../shared/services/login';
import { forkJoin } from 'rxjs';

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
  providers: [TimesheetService, ProjectService, LoginService, { provide: NgbDateParserFormatter, useClass: CustomDateFormatter }]
})
export class LogTime implements OnInit {
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

  constructor(
    private timesheetService: TimesheetService,
    private projectService: ProjectService,
    private loginService: LoginService,
    private route: ActivatedRoute,
    private router: Router,
    private calendar: NgbCalendar
  ) {}

  ngOnInit(): void {
    // Get current user from localStorage
    this.currentUser = this.loginService.getCurrentUser();
    
    if (!this.currentUser) {
      // Redirect to login if no user found
      this.router.navigate(['/login']);
      return;
    }

    // Get project name from route
    this.route.paramMap.subscribe(params => {
      this.projectName = decodeURIComponent(params.get('name') || '');
      if (this.projectName) {
        this.loadProjectData();
      }
    });
  }

  loadProjectData(): void {
    this.loading = true;
    this.projectService.getProjectByName(this.projectName).subscribe({
      next: (project) => {
        this.project = project || null;
        if (this.project) {
          this.setupDateRestrictions();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading project:', error);
        this.loading = false;
      }
    });
  }

  setupDateRestrictions(): void {
    if (!this.project) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse project start and end dates (format: DD-MM-YYYY)
    const [startDay, startMonth, startYear] = this.project.startDate.split('-').map(Number);
    const projectStartDate = new Date(startYear, startMonth - 1, startDay);
    
    const [endDay, endMonth, endYear] = this.project.endDate.trim().split('-').map(Number);
    const projectEndDate = new Date(endYear, endMonth - 1, endDay);

    // Calculate 5 business days including today (so go back 4 days)
    const fiveBusinessDaysAgo = this.calculateBusinessDaysAgo(today, 4);

    // Max date is today or project end date, whichever is earlier
    const maxDateValue = today < projectEndDate ? today : projectEndDate;
    
    // Min date is the later of: project start date or 5 business days ago
    const minDateValue = projectStartDate > fiveBusinessDaysAgo ? projectStartDate : fiveBusinessDaysAgo;

    this.minDateStruct = this.dateToNgbDate(minDateValue);
    this.maxDateStruct = this.dateToNgbDate(maxDateValue);
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
      if (checkDate.getDay() !== 0 && checkDate.getDay() !== 6) {
        businessDaysCount++;
      }
    }

    result.setDate(fromDate.getDate() - daysToSubtract);
    return result;
  }

  // Disable weekends in the datepicker
  isDisabled = (date: NgbDate, current?: { year: number; month: number }) => {
    const jsDate = new Date(date.year, date.month - 1, date.day);
    return jsDate.getDay() === 0 || jsDate.getDay() === 6; // Disable Sunday and Saturday
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
    // Format as DD/MM/YYYY for storage
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatDateTimeForStorage(date: Date): string {
    // Format as DD/MM/YYYY HH:MM AM/PM
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const hoursStr = String(hours).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm}`;
  }

  onDateChange(): void {
    if (!this.selectedDate) {
      this.dateError = 'Date is required';
      return;
    }

    const jsDate = this.ngbDateToDate(this.selectedDate);
    
    // Check if it's a weekend
    if (jsDate.getDay() === 0 || jsDate.getDay() === 6) {
      this.dateError = 'Weekends are not allowed';
      this.selectedDate = null;
      return;
    }

    this.dateError = '';
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
    } else if (this.hours > 9) {
      this.hoursError = 'Hours cannot exceed 9';
      isValid = false;
    } else if (!Number.isInteger(this.hours)) {
      this.hoursError = 'Hours must be a whole number';
      isValid = false;
    } else {
      this.hoursError = '';
    }

    // Validate issue
    if (!this.issue || this.issue.trim() === '') {
      this.issueError = 'Issue description is required';
      isValid = false;
    } else if (this.issue.trim().length < 10) {
      this.issueError = 'Issue description must be at least 10 characters';
      isValid = false;
    } else if (this.issue.trim().length > 500) {
      this.issueError = 'Issue description cannot exceed 500 characters';
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
      // Get all timesheets for this user on this date
      this.timesheetService.getTimesheets().subscribe({
        next: (timesheets) => {
          // Filter timesheets for same user and same date
          const existingTimesheets = timesheets.filter(ts => 
            ts.user === this.currentUser!.email && 
            ts.date === dateString
          );

          // Calculate total hours already logged for this day
          const totalExistingHours = existingTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
          
          // Check if adding current hours would exceed 9
          const totalHours = totalExistingHours + (this.hours || 0);
          
          if (totalHours > 9) {
            this.hoursError = `Total hours for this day would be ${totalHours}. Maximum allowed is 9 hours per day. You already have ${totalExistingHours} hours logged.`;
            resolve(false);
          } else {
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
    if (!this.validateForm() || !this.currentUser || !this.project || !this.selectedDate) {
      return;
    }

    // Check daily hours limit
    const isWithinLimit = await this.checkDailyHoursLimit();
    if (!isWithinLimit) {
      return;
    }

    const selectedJsDate = this.ngbDateToDate(this.selectedDate);
    const now = new Date();
    
    const newTimesheet: Omit<Timesheet, 'id'> = {
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

    this.timesheetService.createTimesheet(newTimesheet).subscribe({
      next: (createdTimesheet) => {
        console.log('Timesheet created successfully:', createdTimesheet);
        
        if (addAnother) {
          // Clear form for another entry
          this.clearForm();
        } else {
          // Navigate back to project timesheet page
          this.router.navigate(['/project', encodeURIComponent(this.projectName)]);
        }
      },
      error: (error) => {
        console.error('Error creating timesheet:', error);
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