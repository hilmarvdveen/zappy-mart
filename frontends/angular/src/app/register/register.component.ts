import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginFormComponent } from '../../shared/components/login-form/login-form.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  imports: [RouterLink, LoginFormComponent],
})
export class RegisterComponent {}
