import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import HeaderComponent from './header/header.component';
import { WishlistDrawerComponent } from './wishlist-drawer/wishlist-drawer.component';
import { WishlistDrawerService } from './wishlist-drawer/wishlist-drawer.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [HeaderComponent, RouterOutlet, WishlistDrawerComponent],
})
export class AppComponent {
  readonly drawerOpen = inject(WishlistDrawerService).isOpen;
}
