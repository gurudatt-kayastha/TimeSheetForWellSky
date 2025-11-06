import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService } from '../../services/timesheet.service';
import { TimesheetSaveModalComponent } from '../timesheet-save-modal/timesheet-save-modal.component';
import { TimesheetEntry, TimesheetStatus } from '../../models/timesheet.model';

@Component({
  selector: 'app-timesheet-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TimesheetSaveModalComponent],
  template: `
  <div class="container">
    <h2>Timesheet Approvals (Admin)</h2>

    <div class="controls">
      <label>Filter by project:
        <select [(ngModel)]="filters.project">
          <option value="">-- All projects --</option>
          <option *ngFor="let p of projects" [value]="p">{{p}}</option>
        </select>
      </label>

      <label>Filter by status:
        <select [(ngModel)]="filters.status">
          <option value="">-- All statuses --</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </label>

      <button (click)="selectAllVisible()">Select Visible</button>
      <button (click)="clearSelection()">Clear Selection</button>

      <div class="bulk-actions">
        <button (click)="prepareBulk('APPROVED')" [disabled]="!hasSelected()">Approve Selected</button>
        <button (click)="prepareBulk('REJECTED')" [disabled]="!hasSelected()">Reject Selected</button>
      </div>
    </div>

    <table class="timesheet-table">
      <thead>
        <tr>
          <th><input type="checkbox" [checked]="allVisibleSelected()" (change)="toggleSelectAll($event)" /></th>
          <th>Date</th>
          <th>User</th>
          <th>Comment</th>
          <th>Created Date</th>
          <th>Unit</th>
          <th>Project</th>
          <th>Activity</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let e of filteredEntries(); let i = index" [class.selected]="isSelected(e.id)">
          <td><input type="checkbox" [checked]="isSelected(e.id)" (change)="onToggleSelect(e.id, $event)" /></td>
          <td>{{ e.date | date:'mediumDate' }}</td>
          <td>{{ e.user }}</td>
          <td class="comment">{{ e.comment || '-' }}</td>
          <td>{{ e.createdDate | date:'short' }}</td>
          <td>{{ e.unit }}</td>
          <td>{{ e.project }}</td>
          <td>{{ e.activity }}</td>
          <td>
            <span class="status" [ngClass]="e.status">{{ e.status }}</span>
          </td>
          <td class="row-actions">
            <button (click)="prepareSingle(e, 'APPROVED')" [disabled]="e.status === 'APPROVED'">Approve</button>
            <button (click)="prepareSingle(e, 'REJECTED')" [disabled]="e.status === 'REJECTED'">Reject</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div>Selected: {{ selectedCount() }}</div>
      <button (click)="openSaveModal()" [disabled]="!hasPendingChanges()">Save Changes</button>
    </div>

    <app-timesheet-save-modal *ngIf="modalOpen"
      [changes]="modalChanges"
      (onConfirm)="commitModal($event)"
      (onCancel)="closeModal()"></app-timesheet-save-modal>

    <div class="toast" *ngIf="toast.show">{{ toast.message }}</div>
  </div>
  `
})
export class TimesheetAdminComponent {
  filters = { project: '', status: '' };
  modalOpen = false;
  modalChanges: { entry: TimesheetEntry; newStatus: TimesheetStatus }[] = [];
  toast = { show: false, message: '' };
  projects: string[] = [];

  constructor(public svc: TimesheetService) {
    this.projects = Array.from(new Set(this.svc.entries.map(e => e.project)));
  }

  filteredEntries() {
    return this.svc.entries.filter(e => {
      if (this.filters.project && e.project !== this.filters.project) return false;
      if (this.filters.status && e.status !== this.filters.status) return false;
      return true;
    });
  }

  onToggleSelect(id: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.svc.toggleSelect(id, checked);
  }

  isSelected(id: string) {
    return !!this.svc.selection[id];
  }

  selectAllVisible() {
    const ids = this.filteredEntries().map(e => e.id);
    this.svc.selectAllVisible(ids);
  }

  clearSelection() {
    this.svc.clearSelection();
  }

  allVisibleSelected() {
    const visible = this.filteredEntries();
    if (visible.length === 0) return false;
    return visible.every(e => this.isSelected(e.id));
  }

  toggleSelectAll(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.filteredEntries().forEach(e => this.svc.toggleSelect(e.id, checked));
  }

  hasSelected() {
    return this.svc.selectedIds().length > 0;
  }

  selectedCount() {
    return this.svc.selectedIds().length;
  }

  prepareSingle(entry: TimesheetEntry, newStatus: TimesheetStatus) {
    this.svc.toggleSelect(entry.id, true);
    this.svc.stageChange(entry.id, newStatus);
    this.openSaveModal();
  }

  prepareBulk(newStatus: TimesheetStatus) {
    const ids = this.svc.selectedIds();
    this.svc.stageBulkChange(ids, newStatus);
    this.openSaveModal();
  }

  hasPendingChanges() {
    return Object.keys(this.svc.pendingChanges).length > 0;
  }

  openSaveModal() {
    this.modalChanges = this.svc.gatherPendingChanges();
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
  }

  commitModal(comment?: string) {
    const applied = this.svc.commitChanges(comment);
    this.modalOpen = false;
    this.showToast(`${applied} change(s) saved successfully`);
  }

  showToast(message: string) {
    this.toast.message = message;
    this.toast.show = true;
    setTimeout(() => (this.toast.show = false), 3000);
  }
}
