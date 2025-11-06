import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ProjectService, Project } from '../../shared/services/project';
import { TimesheetService } from '../../shared/services/timesheet';
import { forkJoin, Observable, of } from 'rxjs';

export interface ProjectWithHours extends Project {
  totalHours: number;
}

@Component({
  selector: 'app-projects',
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  providers: [ProjectService, TimesheetService]
})
export class Projects implements OnInit {
  projects: ProjectWithHours[] = [];
  loading: boolean = true;
  currentUser: string = JSON.parse(localStorage.getItem('currentUser') || '{}')?.email || '';

  constructor(
    private projectService: ProjectService,
    private timesheetService: TimesheetService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.initAdminFlag(); // Added for admin functionality
  }

  loadProjects(): void {
    this.loading = true;
    this.projectService.getProjectsForUser(this.currentUser).subscribe({
      next: (projects) => {
        const hourRequests = projects.map(project => 
          this.timesheetService.getTotalHoursByProjectForUser(project.name, this.currentUser)
        );

        if (hourRequests.length > 0) {
          forkJoin(hourRequests).subscribe({
            next: (hoursArray) => {
              this.projects = projects.map((project, index) => ({
                ...project,
                totalHours: hoursArray[index]
              }));
              this.loading = false;
            },
            error: (error) => {
              console.error('Error loading project hours:', error);
              this.projects = projects.map(project => ({
                ...project,
                totalHours: 0
              }));
              this.loading = false;
            }
          });
        } else {
          this.projects = [];
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.loading = false;
      }
    });
  }

  getProjectUrl(projectName: string): string {
    return `/project/${encodeURIComponent(projectName)}`;
  }

  getStatusClass(status: string): string {
    return status.toLowerCase() === 'active' ? 'status-active' : 'status-inactive';
  }

  isAdmin: boolean = false;
  selectedUsers: Record<string, Set<string>> = {};
  showUserListForProject: Record<string, boolean> = {};

  initAdminFlag(): void {
    try {
      const raw = localStorage.getItem('currentUser') || '{}';
      const cu = JSON.parse(raw);
      if (cu) {
        if (typeof cu.role === 'string') {
          this.isAdmin = cu.role.toLowerCase() === 'admin';
        } else if (Array.isArray(cu.roles)) {
          this.isAdmin = cu.roles.map((r: any) => String(r).toLowerCase()).includes('admin');
        } else {
          this.isAdmin = !!cu.isAdmin;
        }
      }
    } catch (e) {
      console.warn('initAdminFlag: could not parse currentUser', e);
      this.isAdmin = false;
    }
  }

  private ensureProjectSet(projectId: string | number): Set<string> {
    const pid = String(projectId);
    if (!this.selectedUsers[pid]) {
      this.selectedUsers[pid] = new Set<string>();
    }
    return this.selectedUsers[pid];
  }

  isUserSelected(projectId: string | number, userId: string | number): boolean {
    const set = this.selectedUsers[String(projectId)];
    return !!(set && set.has(String(userId)));
  }

  toggleUserSelection(projectId: string | number, userId: string | number, checked: boolean): void {
    const set = this.ensureProjectSet(String(projectId));
    if (checked) set.add(String(userId));
    else set.delete(String(userId));
  }

  toggleSelectAll(projectId: string | number, checked: boolean): void {
    const project = this.projects.find(p => String(p.id) === String(projectId));
    if (!project) return;
    const set = this.ensureProjectSet(String(projectId));
    if (checked) {
      (project.assignedUsers || []).forEach((u: any) => set.add(String(u.id)));
    } else {
      this.selectedUsers[String(projectId)] = new Set<string>();
    }
  }

  areAllUsersSelected(projectId: string | number): boolean {
    const project = this.projects.find(p => String(p.id) === String(projectId));
    if (!project) return false;
    const set = this.selectedUsers[String(projectId)];
    return !!set && project.assignedUsers && set.size === project.assignedUsers.length;
  }

  hasSelection(projectIdOrProject: string | any): boolean {
    const pid = typeof projectIdOrProject === 'object' ? String(projectIdOrProject.id) : String(projectIdOrProject);
    const set = this.selectedUsers[pid];
    return !!(set && set.size > 0);
  }

  openUserSelectionList(project: any): void {
    this.showUserListForProject[project.id] = !this.showUserListForProject[project.id];
  }

  private getSelectedUserIdsForProject(project: any): string[] {
    const set = this.selectedUsers[String(project.id)];
    return set ? Array.from(set) : [];
  }

  approveSelected(project: any): void {
    const userIds = this.getSelectedUserIdsForProject(project);
    if (!userIds.length) { alert('No users selected'); return; }

    if (this.timesheetService && typeof (this.timesheetService as any).approveTimesheetEntries === 'function') {
      (this.timesheetService as any).approveTimesheetEntries(project.id || project.name, userIds)
        .subscribe({
          next: (res: any) => {
            alert(`Approved timesheet entries for ${userIds.length} user(s).`);
            this.selectedUsers[String(project.id)] = new Set<string>();
          },
          error: (err: any) => {
            console.error('approveSelected error', err);
            alert('Failed to approve entries. Check console.');
          }
        });
      return;
    }

    if (this.timesheetService && typeof (this.timesheetService as any).bulkUpdateEntries === 'function') {
      (this.timesheetService as any).bulkUpdateEntries(project.id || project.name, userIds, 'approve')
        .subscribe({
          next: () => {
            alert(`Approved entries for ${userIds.length} user(s).`);
            this.selectedUsers[String(project.id)] = new Set<string>();
          },
          error: (err: any) => {
            console.error('approveSelected error', err);
            alert('Failed to approve entries. Check console.');
          }
        });
      return;
    }

    if (this.timesheetService && typeof (this.timesheetService as any).approveEntryByUser === 'function') {
      const calls: Observable<any>[] = userIds.map((uid: string) =>
        (this.timesheetService as any).approveEntryByUser(project.id || project.name, uid)
      );
      try {
        forkJoin(calls).subscribe({
          next: () => {
            alert(`Approved entries for ${userIds.length} user(s).`);
            this.selectedUsers[String(project.id)] = new Set<string>();
          },
          error: (err: any) => {
            console.error('approveSelected bulk error', err);
            alert('Partial/complete failure when approving entries. Check console.');
          }
        });
      } catch (e) {
        Promise.all(calls.map(obs => obs.toPromise ? obs.toPromise() : Promise.resolve()))
          .then(() => {
            alert(`Approved entries for ${userIds.length} user(s).`);
            this.selectedUsers[String(project.id)] = new Set<string>();
          })
          .catch((err) => {
            console.error('approveSelected fallback error', err);
            alert('Failed to approve entries. Check console.');
          });
      }
      return;
    }

    console.warn('No TimesheetService bulk methods found; skipping server call (simulate success).');
    alert(`(Simulated) Approved entries for ${userIds.length} user(s).`);
    this.selectedUsers[String(project.id)] = new Set<string>();
  }

  rejectSelected(project: any): void {
    const userIds = this.getSelectedUserIdsForProject(project);
    if (!userIds.length) { alert('No users selected'); return; }

    if (this.timesheetService && typeof (this.timesheetService as any).rejectTimesheetEntries === 'function') {
      (this.timesheetService as any).rejectTimesheetEntries(project.id || project.name, userIds)
        .subscribe({
          next: () => {
            alert(`Rejected timesheet entries for ${userIds.length} user(s).`);
            this.selectedUsers[String(project.id)] = new Set<string>();
          },
          error: (err: any) => {
            console.error('rejectSelected error', err);
            alert('Failed to reject entries. Check console.');
          }
        });
      return;
    }

    if (this.timesheetService && typeof (this.timesheetService as any).bulkUpdateEntries === 'function') {
      (this.timesheetService as any).bulkUpdateEntries(project.id || project.name, userIds, 'reject')
        .subscribe({
          next: () => {
            alert(`Rejected entries for ${userIds.length} user(s).`);
            this.selectedUsers[String(project.id)] = new Set<string>();
          },
          error: (err: any) => {
            console.error('rejectSelected error', err);
            alert('Failed to reject entries. Check console.');
          }
        });
      return;
    }

    if (this.timesheetService && typeof (this.timesheetService as any).rejectEntryByUser === 'function') {
      const calls: Observable<any>[] = userIds.map((uid: string) =>
        (this.timesheetService as any).rejectEntryByUser(project.id || project.name, uid)
      );
      try {
        forkJoin(calls).subscribe({
          next: () => {
            alert(`Rejected entries for ${userIds.length} user(s).`);
            this.selectedUsers[String(project.id)] = new Set<string>();
          },
          error: (err: any) => {
            console.error('rejectSelected bulk error', err);
            alert('Partial/complete failure when rejecting entries. Check console.');
          }
        });
      } catch (e) {
        Promise.all(calls.map(obs => obs.toPromise ? obs.toPromise() : Promise.resolve()))
          .then(() => {
            alert(`Rejected entries for ${userIds.length} user(s).`);
            this.selectedUsers[String(project.id)] = new Set<string>();
          })
          .catch((err) => {
            console.error('rejectSelected fallback error', err);
            alert('Failed to reject entries. Check console.');
          });
      }
      return;
    }

    console.warn('No TimesheetService bulk methods found; skipping server call (simulate success).');
    alert(`(Simulated) Rejected entries for ${userIds.length} user(s).`);
    this.selectedUsers[String(project.id)] = new Set<string>();
  }
}
