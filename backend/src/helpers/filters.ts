import { Model, ModelStatic, Op, Order, WhereOptions } from 'sequelize';

export interface QueryParams {
  where: WhereOptions;
  order: Order;
  limit: number;
  offset: number;
  page: number;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_ORDER: Order = [['updatedAt', 'DESC']];
const STRING_TYPES = new Set(['STRING', 'TEXT', 'CHAR', 'CITEXT']);
// Columns that must never be searchable/sortable from the client.
const BLOCKED_COLUMNS = new Set(['password']);

interface ColumnSets {
  sortable: Set<string>;
  searchable: Set<string>;
}

/** Derive allowed sort/search columns straight from the model definition. */
function columnSets(model: ModelStatic<Model>): ColumnSets {
  const sortable = new Set<string>();
  const searchable = new Set<string>();

  for (const [name, def] of Object.entries(model.getAttributes())) {
    if (BLOCKED_COLUMNS.has(name)) continue;
    sortable.add(name);

    const typeKey = (def.type as { key?: string })?.key;
    if (typeof typeKey === 'string' && STRING_TYPES.has(typeKey)) {
      searchable.add(name); // ILIKE only makes sense on text columns
    }
  }

  return { sortable, searchable };
}

/**
 * Parse the `data` JSON query param into Sequelize findAndCountAll options.
 * Shape: { search: {field: value}, sorting: {field: 'asc'|'desc'},
 *          dataLimit: number, pagination: number }
 * Unknown / non-text fields are ignored so a bad client query can't crash the
 * endpoint with a column-does-not-exist error.
 */
export const parseRequestParams = (
  req: { query?: Record<string, unknown> },
  model: ModelStatic<Model>
): QueryParams => {
  let limit = DEFAULT_LIMIT;
  let page = 1;
  let where: WhereOptions = {};
  let order: Order = DEFAULT_ORDER;

  const raw = req.query?.data;
  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      const data = JSON.parse(raw);
      const cols = columnSets(model);
      where = parseSearchFilters(data.search, cols.searchable);
      order = parseSorting(data.sorting, cols.sortable);
      limit = Math.max(1, parseInt(data.dataLimit, 10) || DEFAULT_LIMIT);
      page = Math.max(1, parseInt(data.pagination, 10) || 1);
    } catch (error) {
      console.warn(
        'Error parsing request parameters:',
        (error as Error).message
      );
    }
  }

  return { where, order, limit, offset: (page - 1) * limit, page };
};

/** Build a case-insensitive partial-match WHERE over allowed text columns. */
export const parseSearchFilters = (
  search: Record<string, string> | undefined,
  searchable: Set<string>
): WhereOptions => {
  if (!search || typeof search !== 'object') return {};

  const where: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(search)) {
    if (!searchable.has(key)) continue;
    if (typeof value === 'string' && value.trim() !== '') {
      where[key] = { [Op.iLike]: `%${value.trim()}%` };
    }
  }
  return where;
};

const parseSorting = (
  sorting: Record<string, string> | undefined,
  sortable: Set<string>
): Order => {
  if (!sorting || typeof sorting !== 'object') return DEFAULT_ORDER;

  const order: [string, 'ASC' | 'DESC'][] = [];
  for (const [field, dir] of Object.entries(sorting)) {
    if (!sortable.has(field)) continue;
    order.push([field, String(dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC']);
  }
  return order.length > 0 ? order : DEFAULT_ORDER;
};

export const calculatePaginationInfo = (
  totalDocs: number,
  limit: number,
  page: number
) => {
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit));
  const currentPage = Math.min(page, totalPages);

  return { currentPage, totalPages, pageSize: limit, totalDocs };
};
