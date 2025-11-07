import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetEntry } from '../../models/timesheet.model';

@Component({
  selector: 'app-timesheet-save-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timesheet-save-modal.component.html',
  styleUrls: ['./timesheet-save-modal.component.scss']
})
export class TimesheetSaveModalComponent {
  @Input() changes: { entry: TimesheetEntry; newStatus: string }[] = [];
  @Output() onConfirm = new EventEmitter<string>();
  @Output() onCancel = new EventEmitter<void>();

  comment = '';

  confirm() {
    this.onConfirm.emit(this.comment);
  }

  cancel() {
    this.onCancel.emit();
  }
}