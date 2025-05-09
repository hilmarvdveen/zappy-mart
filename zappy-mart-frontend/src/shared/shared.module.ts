import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import HeaderComponent from '../app/header/header.component';
import ProductCardComponent from './components/product-card/product-card.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [ProductCardComponent],
  imports: [CommonModule, RouterModule],
  exports: [ ProductCardComponent, CommonModule, RouterModule],
})
export class SharedModule {}
