import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not existing');
    }

    const productsExisting = await this.productsRepository.findAllById(
      products,
    );

    const productsToCreateOrder = products.map(product => {
      const productFindInStock = productsExisting.find(
        productExistingInStock => productExistingInStock.id === product.id,
      );

      if (productFindInStock) {
        if (productFindInStock.quantity < product.quantity) {
          throw new AppError('Insufficient Stock');
        }
        return {
          product_id: product.id,
          price: productFindInStock.price,
          quantity: product.quantity,
        };
      }

      throw new AppError('Opps! Something went wrong');
    });

    if (!productsExisting || products.length !== productsExisting.length) {
      throw new AppError(
        'Opps! Some product not existign, please verify and try againg ',
      );
    }

    const order = await this.ordersRepository.create({
      customer,
      products: productsToCreateOrder,
    });

    const sucrilos = await this.ordersRepository.findById(order.id);

    if (sucrilos) return sucrilos;

    return order;
  }
}

export default CreateOrderService;
