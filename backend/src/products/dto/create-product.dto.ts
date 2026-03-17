export class CreateProductDto {
  name: string;
  price_cost: string; // Para poder calcular el ROI
  price_sale: string;
  stock?: string;
  min_stock?: string;
  image_url?: string | null;
  is_pack?: string;
  pack_items?: string;
}
