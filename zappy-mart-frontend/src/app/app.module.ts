import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SharedModule } from '../shared/shared.module';
import ProductsComponent from './products/products.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { WishListDrawerComponent } from './wish-list-drawer/wish-list-drawer.component';
import { HomeComponent } from './home/home.component';

@NgModule({
  declarations: [AppComponent, ProductsComponent, WishListDrawerComponent, HomeComponent],
  imports: [BrowserModule, AppRoutingModule, SharedModule],
  providers: [provideHttpClient(withInterceptorsFromDi())],
  bootstrap: [AppComponent],
})
export class AppModule {}
