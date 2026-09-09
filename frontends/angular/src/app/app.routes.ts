import { Routes } from '@angular/router';
import { AboutComponent } from './about/about.component';
import { AccountComponent } from './account/account.component';
import { signedInGuard } from './account/signed-in.guard';
import { CartComponent } from './cart/cart.component';
import { CatalogueComponent } from './catalogue/catalogue.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { LoginComponent } from './login/login.component';
import { OrderConfirmationComponent } from './order-confirmation/order-confirmation.component';
import { ProductComponent } from './product/product.component';
import { RegisterComponent } from './register/register.component';

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
    title: 'Cart | Zappy Mart',
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [signedInGuard],
    title: 'Checkout | Zappy Mart',
  },
  {
    path: 'orders/:orderId',
    component: OrderConfirmationComponent,
    canActivate: [signedInGuard],
    title: 'Your order | Zappy Mart',
  },
  {
    path: 'account',
    component: AccountComponent,
    canActivate: [signedInGuard],
    title: 'Your account | Zappy Mart',
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Log in | Zappy Mart',
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Register | Zappy Mart',
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
