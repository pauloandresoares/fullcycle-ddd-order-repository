import Order from "../../../../domain/checkout/entity/order";
import OrderItemModel from "./order-item.model";
import OrderModel from "./order.model";
import OrderRepositoryInterface from '../../../../domain/checkout/repository/order-repository.interface';
import OrderItem from '../../../../domain/checkout/entity/order_item';

export default class OrderRepository implements OrderRepositoryInterface {
    async find(id: string): Promise<Order> {
        const orderModel = await OrderModel.findOne({ where: { id }, include: ["items"] });
        const orderItemModel = orderModel.items.map(item => new OrderItem(item.id, item.name, item.price, item.totalPrice, item.product_id, item.quantity));
        const order = new Order(orderModel.id, orderModel.customer_id, orderItemModel)
        return order;
    }

    async findAll(): Promise<Order[]> {
        const orderModels = await OrderModel.findAll();
        return orderModels.map((orderModel) => {
            const orderItemModel = orderModel.items.map(item => new OrderItem(item.id, item.name, item.price, item.totalPrice, item.product_id, item.quantity));
            return new Order(orderModel.id, orderModel.customer_id, orderItemModel);
            }
        );
    }

    async update(entity: Order): Promise<void> {

        const order = await OrderModel.findOne({
            where: { id: entity.id },
            include: ["items"],
            rejectOnEmpty: true,
        });

        const destroyOrderItemsPromise = order.items.map((item) =>
            OrderItemModel.destroy({
                where: {
                    id: item.id
                }
            })
        );
        await Promise.all(destroyOrderItemsPromise);

        const addOrderItemsPromise = entity.items.map(item => {
            const { id, name, price, productId, quantity, totalPrice } = item;
            return OrderItemModel.create({
                id,
                name,
                price,
                totalPrice,
                product_id: productId,
                quantity,
                order_id: entity.id
            });
        })
        await Promise.all(addOrderItemsPromise);

        await OrderModel.update(
            {
                customer_id: entity.customerId,
                total: entity.total(),
            },
            {
                where: {
                    id: entity.id,
                },
            }
        );
    }
  async create(entity: Order): Promise<void> {
    await OrderModel.create(
      {
        id: entity.id,
        customer_id: entity.customerId,
        total: entity.total(),
        items: entity.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          totalPrice: item.totalPrice,
          product_id: item.productId,
          quantity: item.quantity,
        })),
      },
      {
        include: [{ model: OrderItemModel }],
      }
    );
  }
}
