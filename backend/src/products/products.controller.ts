import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Delete,
  UseInterceptors, // ✅ Faltaba importar
  UploadedFile, // ✅ Faltaba importar
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../common/cloudinary.service';

@UseGuards(AuthGuard('jwt'))
@Controller('products')
export class ProductsController {
  // ✅ Inyectamos AMBOS servicios en el constructor
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // 🚀 FUSIÓN DE CREATE: Maneja texto e imagen con tipos seguros
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 10 * 1024 * 1024, // Límite de 10MB para la imagen
      },
    }),
  )
  async create(
    // En lugar de 'any', le decimos que el Body es un objeto con campos de texto
    @Body() body: Record<string, string>,
    @UploadedFile() file: any,
  ) {
    let imageUrl: string | null = null;

    if (file) {
      // Subimos a Cloudinary si hay archivo
      imageUrl = await this.cloudinaryService.uploadImage(file);
    }

    // 🛡️ Mapeo explícito: Aquí eliminamos todos los errores de "Unsafe"
    // Al no usar el spread (...) evitamos que el linter se pierda
    const productData: CreateProductDto = {
      name: body.name,
      price_cost: body.price_cost || '0',
      price_sale: body.price_sale || '0',
      stock: body.stock || '0',
      min_stock: body.min_stock || '0',
      is_pack: body.is_pack,
      pack_items: body.pack_items,
      image_url: imageUrl,
    };

    return this.productsService.create(productData);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: UpdateProductDto) {
    return this.productsService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
