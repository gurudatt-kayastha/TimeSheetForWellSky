import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { MyPage } from './features/my-page/my-page/my-page';
import { Register } from './features/auth/register/register';
import { Projects } from './features/projects/projects';
import { ProjectTimesheet } from './features/projects/project-timesheet';
import { LogTime } from './features/projects/log-time';

export const routes: Routes = [
  { path: '', redirectTo: "login", pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'my-page', component: MyPage },
  { path: 'projects', component: Projects },
  { path: 'project/:name', component: ProjectTimesheet },
  { path: 'project/:name/log-time', component: LogTime },
  { path: 'project/:name/log-time/:id', component: LogTime }
];