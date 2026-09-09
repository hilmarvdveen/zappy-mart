import type { Database } from "@zappy/shared";
import { money } from "@zappy/shared";
import type { Category, Product } from "../../domain/product.js";
import type { CategoryRepository, ProductRepository } from "../../application/ports.js";

type ProductRow = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly price_amount: number;
  readonly price_currency: string;
  readonly category_slug: string;
  readonly stock: number;
  readonly image_url: string | null;
};

type CategoryRow = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
};

const productColumns =
  "id, name, slug, description, price_amount, price_currency, category_slug, stock, image_url";

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: money(row.price_amount),
    categorySlug: row.category_slug,
    stock: row.stock,
    imageUrl: row.image_url
  };
}

export function sqlProductRepository(database: Database): ProductRepository {
  return {
    async readAllInCatalogueOrder(): Promise<readonly Product[]> {
      const rows = await database.queryAll<ProductRow>(
        `select ${productColumns} from product order by ordinal asc`
      );
      return rows.map(toProduct);
    },

    async readBySlug(slug: string): Promise<Product | null> {
      const row = await database.queryOne<ProductRow>(
        `select ${productColumns} from product where slug = ?`,
        [slug]
      );
      return row === null ? null : toProduct(row);
    },

    async readManyByIdentifier(identifiers: readonly string[]): Promise<readonly Product[]> {
      if (identifiers.length === 0) {
        return [];
      }
      const placeholders = identifiers.map(() => "?").join(", ");
      const rows = await database.queryAll<ProductRow>(
        `select ${productColumns} from product where id in (${placeholders})`,
        [...identifiers]
      );
      return rows.map(toProduct);
    },

    async writeStock(productId: string, stock: number): Promise<void> {
      await database.execute("update product set stock = ? where id = ?", [stock, productId]);
    },

    async replaceCatalogue(products, categories): Promise<void> {
      await database.execute("delete from product");
      await database.execute("delete from category");
      let categoryOrdinal = 0;
      for (const category of categories) {
        await database.execute(
          "insert into category (id, name, slug, ordinal) values (?, ?, ?, ?)",
          [category.id, category.name, category.slug, categoryOrdinal]
        );
        categoryOrdinal = categoryOrdinal + 1;
      }
      let productOrdinal = 0;
      for (const product of products) {
        await database.execute(
          `insert into product (${productColumns}, ordinal)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.id,
            product.name,
            product.slug,
            product.description,
            product.price.amount,
            product.price.currency,
            product.categorySlug,
            product.stock,
            product.imageUrl,
            productOrdinal
          ]
        );
        productOrdinal = productOrdinal + 1;
      }
    }
  };
}

export function sqlCategoryRepository(database: Database): CategoryRepository {
  return {
    async readAllInSeedOrder(): Promise<readonly Category[]> {
      return database.queryAll<CategoryRow>("select id, name, slug from category order by ordinal asc");
    },

    async readBySlug(slug: string): Promise<Category | null> {
      return database.queryOne<CategoryRow>("select id, name, slug from category where slug = ?", [slug]);
    }
  };
}
