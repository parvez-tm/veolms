import { Request, Response } from 'express';
import { Menu } from './menu-model';

export const getAllMenus = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const menus = await Menu.findAll({ order: [['id', 'ASC']] });
  res.status(200).json({ data: menus, message: 'Menu fetched successfully' });
};
