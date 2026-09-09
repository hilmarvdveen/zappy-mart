import type { SubgraphRequestContext } from "@zappy/shared";
import type { ChangeCart, VisitorIdentity } from "../../application/changeCart.js";
import type { CartRepository, CatalogueReader } from "../../application/ports.js";

export type CartContext = SubgraphRequestContext & {
  readonly cart: ChangeCart;
  readonly carts: CartRepository;
  readonly catalogue: CatalogueReader;
  visitorIdentity(): VisitorIdentity;
  rememberVisitor(): string;
  resetOwnData(): Promise<void>;
};
