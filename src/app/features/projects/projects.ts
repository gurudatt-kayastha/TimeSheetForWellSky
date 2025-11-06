import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ProjectService, Project } from '../../shared/services/project';
import { forkJoin } from 'rxjs';
import { RouterModule } from '@angular/router';
import { TimesheetService } from '../../shared/services/timesheet';

interface ProjectWithHours extends Project {
  totalHours: number;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './projects.html',
  styleUrls: ['./projects.scss']
})
export class Projects implements OnInit {
  today = new Date().toISOString().split('T')[0];
  projects: ProjectWithHours[] = [];
  loading: boolean = true;
  currentUser: string = 'nehal.patel@nitorinfotech.com'; // This should come from auth service
  showAddProjectDialog = false;
  projectForm: FormGroup;
  availableUsers: any[] = []; // Will store users from your system
  showDeleteDialog = false;
  projectToDelete: Project | null = null;

  // Add new property
  showEditProjectDialog = false;
  selectedProject: Project | null = null;

  // New property to check if the user is an admin
  isAdmin: boolean = false;

  constructor(
    private projectService: ProjectService,
    private timesheetService: TimesheetService,
    private fb: FormBuilder
  ) {
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      description: [''],
      status: ['Active'],
      startDate: ['', [Validators.required, this.startDateValidator()]],
      endDate: ['', [Validators.required]],
      assignedUsers: [[]]
    }, {
      validators: this.dateRangeValidator
    });

    // Load available users (you'll need to implement this service)
    this.loadAvailableUsers();

    // Check user role from localStorage
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.isAdmin = user.role === 'Admin';
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.projectService.getProjectsForUser(this.currentUser).subscribe({
      next: (projects) => {
        // Load total hours for each project
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
              // Set projects without hours if hours loading fails
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

  loadAvailableUsers() {
    // Example - replace with your actual user service call
    this.availableUsers = [
      { email: 'nehal.patel@nitorinfotech.com', firstName: 'Nehal', lastName: 'Patel' },
      { email: 'rohit.sali@nitorinfotech.com', firstName: 'Rohit', lastName: 'Sali' },
      { email: 'shivshankar.padnoore@nitorinfotech.com', firstName: 'Shivshankar', lastName: 'Padnoore' },
      { email: 'vaibhav.deo@nitorinfotech.com', firstName: 'Vaibhav', lastName: 'Deo' },
      { email: 'navnath.sonavne@nitorinfotech.com', firstName: 'Navnath', lastName: 'Sonavne' },
      { email: 'shweta.chinchore@nitorinfotech.com', firstName: 'Shweta', lastName: 'Chinchore' },
      { email: 'kareena.joshipura@nitorinfotech.com', firstName: 'Kareena', lastName: 'Joshipura' },
      { email: 'deepa.ghate@nitorinfotech.com', firstName: 'Deepa', lastName: 'Ghate' },
      { email: 'harshita.deore@nitorinfotech.com', firstName: 'Harshita', lastName: 'Deore' },
      { email: 'mayuri.gaikwad@nitorinfotech.com', firstName: 'Mayuri', lastName: 'Gaikwad' },
      { email: 'abhijeet.shah@nitorinfotech.com', firstName: 'Abhijeet', lastName: 'Shah' }
    ];
  }

  getProjectUrl(projectName: string): string {
    return `/project/${encodeURIComponent(projectName)}`;
  }

  getStatusClass(status: string): string {
    return status.toLowerCase() === 'active' ? 'status-active' : 'status-inactive';
  }

  openAddProjectDialog(): void {
    this.showAddProjectDialog = true;
  }

  closeAddProjectDialog(): void {
    this.showAddProjectDialog = false;
    this.projectForm.reset();
  }

  addProject(): void {
    if (!this.isAdmin) return;
    if (this.projectForm.valid) {
      const formValue = this.projectForm.value;
      const newProject: Omit<Project, 'id'> = {
        name: formValue.name!,
        code: formValue.code!,
        description: formValue.description || '',
        status: formValue.status || 'Active',
        assignedUsers: formValue.assignedUsers || [],
        startDate: formValue.startDate!,
        endDate: formValue.endDate!,
        projectManager: JSON.parse(localStorage.getItem('currentUser') || '{}').email || ''
      };

      this.projectService.createProject(newProject).subscribe({
        next: (project) => {
          this.projects = [...this.projects, { ...project, totalHours: 0 }];
          this.closeAddProjectDialog();
        },
        error: (error) => console.error('Error creating project:', error)
      });
    }
  }

  // helper to check if user email is selected
  isAssigned(email: string): boolean {
    const control = this.projectForm.get('assignedUsers');
    const values: string[] = control?.value || [];
    return values.includes(email);
  }

  // toggle a user in the assignedUsers array
  toggleAssigned(email: string, checked: boolean): void {
    const control = this.projectForm.get('assignedUsers');
    const values: string[] = control?.value ? [...control.value] : [];

    if (checked && !values.includes(email)) {
      values.push(email);
    } else if (!checked && values.includes(email)) {
      const idx = values.indexOf(email);
      values.splice(idx, 1);
    }

    control?.setValue(values);
    control?.markAsDirty();
  }

  private startDateValidator(isEdit: boolean = false) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const date = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Skip past date validation in edit mode
      if (isEdit) return null;
      
      if (date < today) {
        return { pastDate: true };
      }
      return null;
    };
  }

  private dateRangeValidator(group: AbstractControl): ValidationErrors | null {
    const startDate = new Date(group.get('startDate')?.value);
    const endDate = new Date(group.get('endDate')?.value);

    if (!startDate || !endDate) return null;

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (endDate <= startDate) {
      return { endDateBeforeStart: true };
    }
    if (diffDays < 30) {
      return { minimumDuration: true };
    }
    return null;
  }

  confirmDelete(project: Project): void {
    if (!this.isAdmin) return;
    this.projectToDelete = project;
    this.showDeleteDialog = true;
  }

  cancelDelete(): void {
    this.projectToDelete = null;
    this.showDeleteDialog = false;
  }

  deleteProject(): void {
    if (!this.projectToDelete) { return; }

    this.projectService.deleteProject(this.projectToDelete.id).subscribe({
      next: () => {
        // remove from local list so UI updates immediately
        this.projects = this.projects.filter(p => p.id !== this.projectToDelete?.id);
        this.cancelDelete();
      },
      error: (err) => {
        console.error('Failed to delete project', err);
        // keep dialog open or close based on preference; here we close
        this.cancelDelete();
      }
    });
  }

  openEditProject(project: Project): void {
    if (!this.isAdmin) return;
    // Reset form with edit-specific validators
    this.projectForm = this.fb.group({
      name: [project.name, Validators.required],
      code: [project.code, Validators.required],
      description: [project.description],
      status: [project.status],
      startDate: [project.startDate, [Validators.required]],  // No past date validation
      endDate: [project.endDate, [Validators.required]],
      assignedUsers: [project.assignedUsers || []]
    }, {
      validators: this.dateRangeValidator  // Keep minimum duration validation
    });

    this.selectedProject = project;
    this.showEditProjectDialog = true;
  }

  closeEditProjectDialog(): void {
    this.showEditProjectDialog = false;
    this.selectedProject = null;
    this.projectForm.reset();
  }

  updateProject(): void {
    if (this.projectForm.valid && this.selectedProject) {
      const formValue = this.projectForm.value;
      const updatedProject: Project = {
        ...this.selectedProject,
        ...formValue,
        id: this.selectedProject.id
      };

      this.projectService.updateProject(updatedProject.id, updatedProject).subscribe({
        next: (response) => {
          // Update the projects array with the updated project
          this.projects = this.projects.map(p => 
            p.id === response.id ? { ...response, totalHours: p.totalHours } : p
          );
          this.closeEditProjectDialog();
        },
        error: (error) => {
          console.error('Error updating project:', error);
        }
      });
    }
  }
}