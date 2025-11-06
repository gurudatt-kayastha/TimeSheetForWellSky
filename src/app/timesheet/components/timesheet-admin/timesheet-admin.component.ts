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
    <h2>Timesheet Admin</h2>

    <!-- Project creation -->
    <section class="create-project">
      <h4>Create Project</h4>
      <label>
        Name:
        <input [(ngModel)]="newProject.name" placeholder="Project name" />
      </label>
      <label>
        Description:
        <input [(ngModel)]="newProject.description" placeholder="Optional description" />
      </label>
      <button (click)="createProject()" [disabled]="!newProject.name.trim()">Create Project</button>
      <div class="small" *ngIf="projectCreatedMsg">{{ projectCreatedMsg }}</div>
    </section>

    <hr />

    <!-- Entry creation -->
    <section class="create-entry">
      <h4>Create Timesheet Entry</h4>
      <label>
        Project:
        <select [(ngModel)]="newEntry.project">
          <option value="">-- Select project --</option>
          <option *ngFor="let p of svc.projects" [value]="p.name">{{ p.name }}</option>
        </select>
      </label>

      <label>
        User:
        <input [(ngModel)]="newEntry.user" placeholder="User name" />
      </label>

      <label>
        Date:
        <input type="date" [(ngModel)]="newEntry.date" />
      </label>

      <label>
        Units:
        <input type="number" min="1" [(ngModel)]="newEntry.unit" />
      </label>

      <label>
        Activity:
        <input [(ngModel)]="newEntry.activity" placeholder="Activity (e.g. Development)" />
      </label>

      <label>
        Comment:
        <input [(ngModel)]="newEntry.comment" placeholder="Optional comment" />
      </label>

      <div class="entry-actions">
        <button (click)="createEntry()" [disabled]="!canCreateEntry()">Add Entry</button>
        <button (click)="resetEntryForm()">Reset</button>
      </div>

      <div class="small" *ngIf="entryCreatedMsg">{{ entryCreatedMsg }}</div>
    </section>

    <hr />

    <!-- Filters & bulk actions -->
    <div class="controls">
      <label>Filter by project:
        <select [(ngModel)]="filters.project">
          <option value="">-- All projects --</option>
          <option *ngFor="let p of svc.projects" [value]="p.name">{{p.name}}</option>
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

    <!-- Timesheet table -->
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
          <td><span class="status" [ngClass]="e.status">{{ e.status }}</span></td>
          <td class="row-actions">
            <button (click)="prepareSingle(e, 'APPROVED')" [disabled]="e.status === 'APPROVED'">Approve</button>
            <button (click)="prepareSingle(e, 'REJECTED')" [disabled]="e.status === 'REJECTED'">Reject</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Footer -->
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
  `,
  styles: [`
    .container{max-width:1100px;margin:18px auto;font-family:Inter,Arial;color:#222}
    section{margin-bottom:12px;padding:8px;border:1px solid #eee;border-radius:6px}
    label{display:inline-block;margin-right:12px}
    input, select {margin-left:6px;padding:4px}
    .entry-actions{margin-top:8px}
    .controls{display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
    .timesheet-table{width:100%;border-collapse:collapse;margin-top:12px}
    .timesheet-table th,.timesheet-table td{padding:8px;border-bottom:1px solid #e6e6e6;text-align:left}
    .comment{max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .status{padding:4px 8px;border-radius:12px;font-weight:600}
    .status.PENDING{background:#fff3cd;color:#856404;border:1px solid #ffe8a1}
    .status.APPROVED{background:#d4edda;color:#155724;border:1px solid #c3e6cb}
    .status.REJECTED{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb}
    .footer{display:flex;justify-content:space-between;padding:12px 0}
    .toast{position:fixed;right:18px;bottom:18px;background:#111;color:#fff;padding:10px 14px;border-radius:8px}
    .small{font-size:13px;color:#333;margin-top:6px}
  `]
})
export class TimesheetAdminComponent {
  filters = { project: '', status: '' };
  modalOpen = false;
  modalChanges: { entry: TimesheetEntry; newStatus: TimesheetStatus }[] = [];
  toast = { show: false, message: '' };

  // project creation state
  newProject = { name: '', description: '' };
  projectCreatedMsg = '';

  // entry creation state
  newEntry = {
    project: '',
    user: '',
    date: this.toDateInput(new Date()),
    unit: 1,
    activity: '',
    comment: ''
  };
  entryCreatedMsg = '';

  constructor(public svc: TimesheetService) {}

  /* -------------------------
     Project & Entry actions
     -------------------------*/
  createProject() {
    const name = this.newProject.name.trim();
    if (!name) return;
    this.svc.addProject(name, this.newProject.description?.trim());
    this.projectCreatedMsg = `Project "${name}" created.`;
    // reset
    this.newProject = { name: '', description: '' };
    setTimeout(() => (this.projectCreatedMsg = ''), 3000);
  }

  canCreateEntry() {
    return !!(this.newEntry.project && this.newEntry.user && this.newEntry.date && this.newEntry.unit > 0 && this.newEntry.activity);
  }

  createEntry() {
    if (!this.canCreateEntry()) return;
    const created = this.svc.addEntry({
      project: this.newEntry.project,
      user: this.newEntry.user.trim(),
      date: this.newEntry.date,
      unit: Number(this.newEntry.unit),
      activity: this.newEntry.activity.trim(),
      comment: this.newEntry.comment?.trim()
    });
    this.entryCreatedMsg = `Entry added (${created.user} - ${created.project}).`;
    // reset form (keep selected project to speed up multiple entries)
    this.newEntry.user = '';
    this.newEntry.date = this.toDateInput(new Date());
    this.newEntry.unit = 1;
    this.newEntry.activity = '';
    this.newEntry.comment = '';
    setTimeout(() => (this.entryCreatedMsg = ''), 3000);
  }

  resetEntryForm() {
    this.newEntry = {
      project: '',
      user: '',
      date: this.toDateInput(new Date()),
      unit: 1,
      activity: '',
      comment: ''
    };
  }

  toDateInput(d: Date) {
    // format to yyyy-MM-dd for <input type="date">
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /* -------------------------
     Existing table & modal functions (unchanged)
     -------------------------*/
  filteredEntries() {
    return this.svc.entries.filter(e => {
      if (this.filters.project && e.project !== this.filters.project) return false;
      if (this.filters.status && e.status !== this.filters.status) return false;
      return true;
    });
  }

  // selection
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

  // prepare changes
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
