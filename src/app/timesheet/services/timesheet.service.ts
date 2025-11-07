import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TimesheetEntry, TimesheetStatus, ProjectModel } from '../models/timesheet.model';

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  // internal state
  private entriesSubject = new BehaviorSubject<TimesheetEntry[]>([]);
  entries$ = this.entriesSubject.asObservable();

  // projects
  private projectsSubject = new BehaviorSubject<ProjectModel[]>([]);
  projects$ = this.projectsSubject.asObservable();

  // selection & pending changes kept in-memory
  selection: Record<string, boolean> = {};
  pendingChanges: Record<string, TimesheetStatus> = {};

  constructor() {
    this.seedMockData();
  }

  private seedMockData() {
    const now = new Date();
    const users = ['Alice', 'Bob', 'Charlie', 'Dana'];
    const projects = ['Project Apollo', 'Project Zephyr', 'Project Orion'];
    const data: TimesheetEntry[] = [];

    // seed projects
    const projModels: ProjectModel[] = projects.map((p, i) => ({
      id: `proj-${100 + i}`,
      name: p,
      description: `Auto-created ${p}`,
      createdDate: new Date(now.getTime() - i * 1000 * 60 * 60 * 24).toISOString()
    }));
    this.projectsSubject.next(projModels);

    for (let i = 0; i < 18; i++) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      data.push({
        id: 'ts-' + (1000 + i),
        date: d.toISOString(),
        user: users[i % users.length],
        comment: i % 3 === 0 ? 'Worked on feature X' : i % 3 === 1 ? 'Bugfix and review' : '',
        createdDate: new Date(now.getTime() - i * 3600 * 1000).toISOString(),
        unit: Math.round(Math.random() * 8) + 1,
        project: projects[i % projects.length],
        activity: ['Development', 'Code Review', 'Testing'][i % 3],
        status: i % 7 === 0 ? 'APPROVED' : i % 5 === 0 ? 'REJECTED' : 'PENDING'
      });
    }

    this.entriesSubject.next(data);
  }

  // entries helpers
  get entries(): TimesheetEntry[] {
    return this.entriesSubject.getValue();
  }

  updateEntries(newEntries: TimesheetEntry[]) {
    this.entriesSubject.next(newEntries);
  }

  // projects helpers
  get projects(): ProjectModel[] {
    return this.projectsSubject.getValue();
  }

  addProject(name: string, description?: string): ProjectModel {
    const id = `proj-${Math.floor(Math.random() * 9000) + 100}`;
    const project: ProjectModel = {
      id,
      name,
      description,
      createdDate: new Date().toISOString()
    };
    const arr = [...this.projects, project];
    this.projectsSubject.next(arr);
    return project;
  }

  // add an entry (under project) — returns the created entry
  addEntry(payload: {
    date: string;
    user: string;
    unit: number;
    project: string;
    activity: string;
    comment?: string;
  }): TimesheetEntry {
    const id = `ts-${Math.floor(Math.random() * 90000) + 1000}`;
    const entry: TimesheetEntry = {
      id,
      date: new Date(payload.date).toISOString(),
      user: payload.user,
      comment: payload.comment || '',
      createdDate: new Date().toISOString(),
      unit: payload.unit,
      project: payload.project,
      activity: payload.activity,
      status: 'PENDING'
    };
    const entries = [entry, ...this.entries];
    this.entriesSubject.next(entries);
    return entry;
  }

  // selection helpers
  toggleSelect(id: string, value: boolean) {
    if (value) this.selection[id] = true;
    else delete this.selection[id];
  }

  clearSelection() {
    this.selection = {};
  }

  selectAllVisible(ids: string[]) {
    ids.forEach(id => (this.selection[id] = true));
  }

  selectedIds() {
    return Object.keys(this.selection).filter(id => this.selection[id]);
  }

  // pending change helpers
  stageChange(id: string, status: TimesheetStatus) {
    this.pendingChanges[id] = status;
  }

  stageBulkChange(ids: string[], status: TimesheetStatus) {
    ids.forEach(id => (this.pendingChanges[id] = status));
  }

  gatherPendingChanges() {
    const changes: { entry: TimesheetEntry; newStatus: TimesheetStatus }[] = [];
    for (const id of Object.keys(this.pendingChanges)) {
      const entry = this.entries.find(e => e.id === id);
      if (!entry) continue;
      const newStatus = this.pendingChanges[id];
      if (entry.status !== newStatus) changes.push({ entry, newStatus });
    }
    return changes;
  }

  commitChanges(comment?: string): number {
    const entries = this.entries.map(e => {
      const newStatus = this.pendingChanges[e.id];
      if (newStatus && e.status !== newStatus) {
        const updated: TimesheetEntry = { ...e, status: newStatus };
        if (comment && comment.trim()) {
          updated.comment = (updated.comment ? updated.comment + ' | ' : '') + comment.trim();
        }
        return updated;
      }
      return e;
    });

    const appliedIds = Object.keys(this.pendingChanges).filter(id => {
      const original = this.entries.find(x => x.id === id);
      return !!original && original.status !== this.pendingChanges[id];
    });

    appliedIds.forEach(id => delete this.pendingChanges[id]);
    appliedIds.forEach(id => delete this.selection[id]);

    this.updateEntries(entries);

    return appliedIds.length;
  }
}
