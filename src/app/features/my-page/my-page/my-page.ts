import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TimesheetService, Timesheet } from '../../../shared/services/timesheet';

@Component({
  selector: 'app-my-page',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './my-page.html',
  styleUrl: './my-page.scss',
  providers: [TimesheetService]
})
export class MyPage implements OnInit {
  timesheets: Timesheet[] = [];
  totalHours: number = 0;
  loading: boolean = true;
  selectedDate: string = 'any';
  selectedStatus: string = 'any';
  selectedUser: string = 'all';
  selectedActivity: string = 'any';

  constructor(private timesheetService: TimesheetService) {}

  ngOnInit(): void {
    this.loadTimesheets();
  }

  loadTimesheets(): void {
    this.loading = true;
    this.timesheetService.getTimesheets().subscribe({
      next: (data) => {
        this.timesheets = data;
        this.calculateTotalHours();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading timesheets:', error);
        this.loading = false;
      }
    });
  }

  calculateTotalHours(): void {
    this.totalHours = this.timesheets.reduce((total, timesheet) => total + timesheet.hours, 0);
  }

  getStatusClass(status: string): string {
    return status.toLowerCase() === 'approved' ? 'status-approved' : 'status-pending';
  }

  onFilterChange(): void {
    // Implementation for date filter
    this.loadTimesheets();
  }

  onAddFilter(): void {
    // Implementation for adding new filter
  }

  onApplyFilter(): void {
    // Implementation for applying filters
  }

  onClearFilter(): void {
    // Implementation for clearing filters
  }

  onLogTime(): void {
    // Implementation for logging new time entry
  }
}
