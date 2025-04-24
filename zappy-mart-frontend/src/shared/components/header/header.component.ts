import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  standalone: false,
})
export default class HeaderComponent {
  menuLinks = [
    { path: '/blog', label: 'Blog' },
    { path: '/over-ons', label: 'Over ons' },
    { path: '/contact', label: 'Contact' },
  ];

  constructor(private router: Router) {}

  isActive(path: string): boolean {
    return this.router.url === path;
  }
}
