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
  templateUrl: './timesheet-admin.component.html',
  styleUrls: ['./timesheet-admin.component.scss']
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
