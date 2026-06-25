import { Transaction } from 'sequelize';
import { Menu } from '../../routes/control/menu/menu-model';

interface SeedMenu {
  routeLink: string;
  label: string;
  icon: string | null;
  checkList: string | null;
  isBoth: boolean;
  /** routeLink of the parent menu, or null for top-level items. */
  parentRoute: string | null;
}

const menuTree: SeedMenu[] = [
  {
    routeLink: 'user-dashboard',
    label: 'User Dashboard',
    icon: 'fa-solid fa-home',
    checkList: null,
    isBoth: false,
    parentRoute: null,
  },
  {
    routeLink: 'admin',
    label: 'Admin',
    icon: 'fa-solid fa-user',
    checkList: null,
    isBoth: false,
    parentRoute: null,
  },
  {
    routeLink: 'admin/user',
    label: 'User',
    icon: null,
    checkList: "['view','create','update','delete']",
    isBoth: false,
    parentRoute: 'admin',
  },
  {
    routeLink: 'admin/role',
    label: 'Role',
    icon: null,
    checkList: "['view','create','update','delete']",
    isBoth: false,
    parentRoute: 'admin',
  },
  {
    routeLink: 'admin/permission',
    label: 'Permission',
    icon: null,
    checkList: "['view','create','update','delete']",
    isBoth: false,
    parentRoute: 'admin',
  },
  {
    routeLink: 'admin/courses',
    label: 'Courses',
    icon: null,
    checkList: "['view','create','update','delete']",
    isBoth: false,
    parentRoute: 'admin',
  },
  {
    routeLink: 'admin/categories',
    label: 'Categories',
    icon: null,
    checkList: "['view','create','update','delete']",
    isBoth: false,
    parentRoute: 'admin',
  },
  {
    routeLink: 'my-learning',
    label: 'My Learning',
    icon: 'fa-solid fa-graduation-cap',
    checkList: null,
    isBoth: false,
    parentRoute: null,
  },
];

/**
 * Seed the menu tree. Top-level items are inserted first so children can
 * resolve their generated parentId. Returns the created Menu rows.
 */
export async function seedMenu(transaction?: Transaction): Promise<Menu[]> {
  const created = new Map<string, Menu>();

  // Parents (parentRoute === null) before children.
  const ordered = [...menuTree].sort(
    (a, b) =>
      (a.parentRoute === null ? 0 : 1) - (b.parentRoute === null ? 0 : 1)
  );

  for (const item of ordered) {
    const parentId = item.parentRoute
      ? created.get(item.parentRoute)?.id ?? null
      : null;

    const menu = await Menu.create(
      {
        routeLink: item.routeLink,
        label: item.label,
        icon: item.icon,
        checkList: item.checkList,
        isBoth: item.isBoth,
        parentId,
      },
      { transaction }
    );

    created.set(item.routeLink, menu);
  }

  return [...created.values()];
}
