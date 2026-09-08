import { Routes } from '@angular/router';
import { OverOnsComponent } from './over-ons/over-ons.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'over-ons',
    component: OverOnsComponent,
  },
  {
    path: '**',
    redirectTo: '/',
  },
];
