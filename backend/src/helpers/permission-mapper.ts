import { MenuSummary } from '../types/interface';
import type { Menu } from '../routes/control/menu/menu-model';
import type { Permission } from '../routes/control/permission/permission-model';

/** Convert a Menu row into the trimmed shape returned to clients. */
export function menuToSummary(menu: Menu): MenuSummary {
  return {
    id: menu.id,
    parentId: menu.parentId ?? null,
    label: menu.label,
    routeLink: menu.routeLink,
    icon: menu.icon ?? null,
    expanded: menu.expanded,
    checkList: menu.checkList ?? null,
    isBoth: menu.isBoth,
  };
}

/** Map internal can* columns to the public create/read/update/delete keys. */
export function permissionToFlags(perm: Permission) {
  return {
    create: perm.canCreate,
    read: perm.canRead,
    update: perm.canUpdate,
    delete: perm.canDelete,
  };
}

/** Accepts either create/read/update/delete or can* keys from the client. */
export interface PermissionFlagsInput {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
  canCreate?: boolean;
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

/** Normalize client-supplied permission flags to the model's can* columns. */
export function flagsToColumns(input: PermissionFlagsInput) {
  return {
    canCreate: input.canCreate ?? input.create ?? false,
    canRead: input.canRead ?? input.read ?? false,
    canUpdate: input.canUpdate ?? input.update ?? false,
    canDelete: input.canDelete ?? input.delete ?? false,
  };
}
