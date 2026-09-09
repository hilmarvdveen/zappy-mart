import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/catalogue.tsx"),
  route("products/:slug", "routes/product.tsx"),
  route("cart", "routes/cart.tsx"),
  route("checkout", "routes/checkout.tsx"),
  route("orders/:orderId", "routes/orderConfirmation.tsx"),
  route("account", "routes/account.tsx"),
  route("wishlist", "routes/wishlist.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
