-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STOCK');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PROCESO', 'ABONADO', 'PAGADO', 'ENTREGADO');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('SANTIAGO', 'REGION', 'METRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STOCK',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_cost" DOUBLE PRECISION NOT NULL,
    "price_sale" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 2,
    "image_url" TEXT,
    "is_pack" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackItem" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PackItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "social_handle" TEXT NOT NULL,
    "social_platform" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PROCESO',
    "delivery_method" "DeliveryMethod" NOT NULL,
    "delivery_cost" INTEGER NOT NULL DEFAULT 0,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "PackItem_pack_id_component_id_key" ON "PackItem"("pack_id", "component_id");

-- AddForeignKey
ALTER TABLE "PackItem" ADD CONSTRAINT "PackItem_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackItem" ADD CONSTRAINT "PackItem_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
