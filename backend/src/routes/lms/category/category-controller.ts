import { Request, Response } from 'express';
import { Op, literal } from 'sequelize';
import { Category } from './category-model';
import { ApiError } from '../../../types/interface';
import {
  calculatePaginationInfo,
  parseRequestParams,
} from '../../../helpers/filters';

/**
 * Public category list for the homepage / catalog browse, each annotated with
 * the number of PUBLISHED courses in it (computed in a correlated subquery).
 */
export const getPublicCategories = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const categories = await Category.findAll({
    attributes: {
      include: [
        [
          literal(
            '(SELECT COUNT(*) FROM "courses" AS c WHERE c."categoryId" = "Category"."id" AND c."status" = \'published\')'
          ),
          'courseCount',
        ],
      ],
    },
    order: [['name', 'ASC']],
  });
  res.status(200).json({ data: categories, message: 'Categories fetched' });
};

export const getAllCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { where, order, limit, offset, page } = parseRequestParams(req, Category);
  const { rows, count } = await Category.findAndCountAll({
    where,
    order,
    limit,
    offset,
  });
  res.status(200).json({
    data: rows,
    pagination: calculatePaginationInfo(count, limit, page),
  });
};

export const addCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { name, description } = req.body ?? {};
  if (!name) {
    throw new ApiError(400, 'Category name is required');
  }
  if (await Category.findOne({ where: { name } })) {
    throw new ApiError(409, 'Category already exists');
  }
  const category = await Category.create({
    name,
    description: description ?? null,
  });
  res.status(201).json({ data: category, message: 'Category created successfully' });
};

export const updateCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  const category = await Category.findByPk(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const { name, description } = req.body ?? {};
  if (name && name !== category.name) {
    const clash = await Category.findOne({
      where: { name, id: { [Op.ne]: category.id } },
    });
    if (clash) {
      throw new ApiError(409, 'Category already exists');
    }
    category.name = name;
  }
  if (description !== undefined) {
    category.description = description;
  }
  await category.save();
  res.status(200).json({ data: category, message: 'Category updated successfully' });
};

export const deleteCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  const deleted = await Category.destroy({ where: { id: req.params.id } });
  if (!deleted) {
    throw new ApiError(404, 'Category not found');
  }
  res.status(200).json({ message: 'Category deleted successfully' });
};
