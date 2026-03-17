import { DeliveryMethod } from '@prisma/client';

export class CreateOrderItemDto {
  product_id: string;
  quantity: number;
}

export class CreateOrderDto {
  customer_name: string;
  social_handle: string;
  social_platform: string;
  region: string;
  commune: string;
  delivery_method: DeliveryMethod;
  delivery_cost: number;
  items: CreateOrderItemDto[];
}
