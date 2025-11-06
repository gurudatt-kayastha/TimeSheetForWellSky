import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService } from '../../services/timesheet.service';
import { TimesheetEntry } from '../../models/timesheet.model';


@Component({
selector: 'app-timesheet-save-modal',
standalone: true,
imports: [CommonModule, FormsModule],
template: `
<div class="modal-backdrop">
<div class="modal">
<h3>Confirm Changes</h3>
<div *ngIf="changes.length; else none">
<p>The following changes will be applied:</p>
<ul>
<li *ngFor="let c of changes">
<strong>{{ c.entry.user }}</strong> — {{ c.entry.project }} — {{ c.entry.date | date:'mediumDate' }}: will become <em>{{ c.newStatus }}</em>
<div class="small">Current: {{ c.entry.status }} | Unit: {{ c.entry.unit }} | Activity: {{ c.entry.activity }}</div>
</li>
</ul>


<label>Optional comment for change (applies to all changes):</label>
<textarea [(ngModel)]="comment" rows="3"></textarea>


<div class="actions">
<button (click)="confirm()">Confirm & Save</button>
<button (click)="cancel()">Cancel</button>
</div>
</div>
<ng-template #none>
<p>No pending changes to save.</p>
<div class="actions">
<button (click)="cancel()">Close</button>
</div>
</ng-template>
</div>
</div>
`,
styles: [`
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center}
.modal{background:#fff;padding:18px;border-radius:8px;min-width:420px;max-width:90%}
textarea{width:100%;padding:8px}
.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
.small{font-size:12px;color:#666}
`]
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