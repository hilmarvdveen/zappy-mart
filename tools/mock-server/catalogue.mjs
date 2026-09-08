export const maximumPageSize = 100;
export const defaultProductPageSize = 24;

export function findCategoryBySlug(store, slug) {
  return store.categories.find((category) => category.slug === slug) ?? null;
}

export function findProductById(store, productId) {
  return store.products.find((product) => product.id === productId) ?? null;
}

export function findProductBySlug(store, slug) {
  return store.products.find((product) => product.slug === slug) ?? null;
}

export function presentProduct(store, product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    category: findCategoryBySlug(store, product.categorySlug),
    stock: product.stock,
    imageUrl: product.imageUrl
  };
}

export function selectProducts(store, filter) {
  const categorySlug = filter?.categorySlug ?? null;
  const nameContains = filter?.nameContains ?? null;
  const inStockOnly = filter?.inStockOnly ?? false;
  const wantedName = nameContains === null ? null : nameContains.toLowerCase();

  return store.products.filter((product) => {
    if (categorySlug !== null && product.categorySlug !== categorySlug) {
      return false;
    }
    if (wantedName !== null && !product.name.toLowerCase().includes(wantedName)) {
      return false;
    }
    if (inStockOnly && product.stock < 1) {
      return false;
    }
    return true;
  });
}

export function encodeCursor(cursorPrefix, id) {
  return Buffer.from(`${cursorPrefix}:${id}`, "utf8").toString("base64");
}

export function createPage(items, { first, defaultSize, after, cursorPrefix, present }) {
  const requestedSize = first ?? defaultSize;
  const pageSize = Math.max(0, Math.min(requestedSize, maximumPageSize));

  let start = 0;
  if (after !== null && after !== undefined) {
    const position = items.findIndex((item) => encodeCursor(cursorPrefix, item.id) === after);
    if (position === -1) {
      return { edges: [], pageInfo: { hasNextPage: false, endCursor: null }, totalCount: items.length };
    }
    start = position + 1;
  }

  const edges = items.slice(start, start + pageSize).map((item) => ({
    cursor: encodeCursor(cursorPrefix, item.id),
    node: present(item)
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage: start + edges.length < items.length,
      endCursor: edges.length === 0 ? null : edges[edges.length - 1].cursor
    },
    totalCount: items.length
  };
}

export const catalogueResolvers = {
  Query: {
    products(parent, { filter, first, after }, context) {
      return createPage(selectProducts(context.store, filter), {
        first,
        defaultSize: defaultProductPageSize,
        after,
        cursorPrefix: "product",
        present: (product) => presentProduct(context.store, product)
      });
    },

    product(parent, { slug }, context) {
      const product = findProductBySlug(context.store, slug);
      return product === null ? null : presentProduct(context.store, product);
    },

    categories(parent, argumentValues, context) {
      return context.store.categories;
    }
  }
};
