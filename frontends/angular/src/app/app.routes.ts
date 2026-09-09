import { Routes } from '@angular/router';
import { AboutComponent } from './about/about.component';
import { AccountComponent } from './account/account.component';
import { CartComponent } from './cart/cart.component';
import { CatalogueComponent } from './catalogue/catalogue.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { OrderConfirmationComponent } from './order-confirmation/order-confirmation.component';
import { ProductComponent } from './product/product.component';

export const routes: Routes = [
  {
    path: '',
    component: CatalogueComponent,
    title: 'Catalogue | Zappy Mart',
  },
  {
    path: 'product/:slug',
    component: ProductComponent,
    title: 'Product | Zappy Mart',
  },
  {
    path: 'cart',
    component: CartComponent,
    title: 'Your cart | Zappy Mart',
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    title: 'Checkout | Zappy Mart',
  },
  {
    path: 'orders/:orderId',
    component: OrderConfirmationComponent,
    title: 'Your order | Zappy Mart',
  },
  {
    path: 'account',
    component: AccountComponent,
    title: 'Your account | Zappy Mart',
  },
  {
    path: 'about',
    component: AboutComponent,
    title: 'About | Zappy Mart',
  },
  {
    path: '**',
    redirectTo: '/',
  },
];
