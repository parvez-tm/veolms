/** Public-facing shape of a menu node returned in the login permission map. */
export interface MenuSummary {
  id: number;
  parentId: number | null;
  label: string;
  routeLink: string;
  icon: string | null;
  expanded: boolean;
  checkList: string | null;
  isBoth: boolean;
}

/** A single role/menu permission entry, flattened for the client. */
export interface PermissionMap {
  menu: MenuSummary;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

/** Decoded JWT payload, also attached to `req.user` by the auth middleware. */
export interface JwtPayload {
  id: number;
  userName: string;
  email: string;
  roleId: number;
  /** Role name, used by requireRole() for domain authorization. */
  roleName: string;
  /** ISO timestamp of the role's last permission change (freshness check). */
  lastPermissionUpdate: string;
}

/** Body shape accepted by POST /permission/addPermission. */
export interface PermissionRequest {
  roleId: number;
  permissions: Array<{
    menuId: number;
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  }>;
}

/** Operational error carrying an HTTP status code, handled centrally. */
export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
    Error.captureStackTrace(this, ApiError);
  }
}
