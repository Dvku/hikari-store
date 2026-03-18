import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Order, OrderItem, Product } from '@prisma/client';

type OrderWithItems = Order & {
  items: (OrderItem & {
    product: Product | null;
  })[];
};

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(startDate: Date, endDate: Date) {
    // --- 1. LÓGICA DE PERIODOS (ACTUAL VS ANTERIOR) ---
    const duration = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - duration);
    const prevEndDate = new Date(startDate.getTime());

    // --- 2. CONSULTAS A PRISMA ---
    // Pedidos Actuales
    const orders = (await this.prisma.order.findMany({
      where: { created_at: { gte: startDate, lte: endDate } },
      include: { items: { include: { product: true } } },
    })) as OrderWithItems[];

    // Pedidos Periodo Anterior (Para las flechitas de variación)
    const prevOrders = (await this.prisma.order.findMany({
      where: { created_at: { gte: prevStartDate, lt: prevEndDate } },
      include: { items: { include: { product: true } } },
    })) as OrderWithItems[];

    // Productos activos (Para inversión y proyectada)
    const products = await this.prisma.product.findMany({
      where: { is_active: true },
    });

    // --- 3. CÁLCULO DE KPIs ACTUALES ---
    const ingresosReales = orders.reduce((sum, o) => sum + o.total_amount, 0);
    const pedidosTotales = orders.length;
    const ticketPromedio =
      pedidosTotales > 0 ? ingresosReales / pedidosTotales : 0;

    // Ganancia Real (Venta - Costo de lo que se vendió)
    const gananciaReal = orders.reduce((sum, order) => {
      const costoPedido = order.items.reduce((cSum, item) => {
        const pCost = item.product?.price_cost || 0;
        return cSum + pCost * item.quantity;
      }, 0);
      return sum + (order.total_amount - order.delivery_cost - costoPedido);
    }, 0);

    const inversionStock = products.reduce(
      (sum, p) => sum + p.price_cost * p.stock,
      0,
    );
    const gananciaProyectada = products.reduce(
      (sum, p) => sum + (p.price_sale - p.price_cost) * p.stock,
      0,
    );

    // --- 4. CÁLCULO DE KPIs ANTERIORES (Para comparar) ---
    const prevIngresos = prevOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const prevPedidos = prevOrders.length;

    // --- 5. CÁLCULO DE VARIACIONES (%) ---
    const calculateVariation = (actual: number, anterior: number) => {
      if (anterior === 0) return actual > 0 ? 100 : 0;
      return Math.round(((actual - anterior) / anterior) * 100);
    };

    const topClientsRaw = await this.prisma.order.groupBy({
      by: ['customer_name', 'social_handle', 'social_platform'],
      _sum: { total_amount: true },
      _count: { id: true },
      where: { created_at: { gte: startDate, lte: endDate } },
    });

    const topClients = topClientsRaw.map((c) => {
      const totalSpent = c._sum.total_amount || 0;
      const orderCount = c._count.id || 0;

      return {
        name: c.customer_name,
        handle: c.social_handle || '@sin_usuario',
        platform: c.social_platform || 'RRSS',
        totalSpent,
        orderCount,
        mixedScore: totalSpent / 10000 + orderCount,
      };
    });

    return {
      kpis: {
        ingresosReales,
        varIngresos: calculateVariation(ingresosReales, prevIngresos), // ▲+15%
        pedidosTotales,
        varPedidos: calculateVariation(pedidosTotales, prevPedidos), // ▼-5%
        gananciaReal,
        inversionStock,
        gananciaProyectada,
        ticketPromedio,
      },
      topClients,
      salesChart: this.prepareSalesChartData(orders),
      topProducts: this.prepareTopProductsData(orders),
      platformChart: this.preparePlatformData(orders),
      deliveryChart: this.prepareDeliveryData(orders),
    };
  }

  // ... (Tus funciones private prepare... se mantienen igual)
  private prepareSalesChartData(orders: OrderWithItems[]) {
    const dailyHash: { [key: string]: number } = {};
    orders.forEach((order) => {
      const date = order.created_at.toISOString().split('T')[0];
      dailyHash[date] = (dailyHash[date] || 0) + order.total_amount;
    });
    return Object.keys(dailyHash).map((date) => ({
      date,
      total: dailyHash[date],
    }));
  }

  private prepareTopProductsData(orders: OrderWithItems[]) {
    const productHash: { [key: string]: number } = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const name = item.product?.name || 'Desconocido';
        productHash[name] = (productHash[name] || 0) + item.quantity;
      });
    });
    return Object.entries(productHash)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }

  private preparePlatformData(orders: OrderWithItems[]) {
    const platformHash: { [key: string]: number } = {};
    orders.forEach((order) => {
      const platform = order.social_platform || 'OTRO';
      platformHash[platform] = (platformHash[platform] || 0) + 1;
    });
    return Object.entries(platformHash).map(([name, value]) => ({
      name,
      value,
    }));
  }

  private prepareDeliveryData(orders: OrderWithItems[]) {
    const deliveryHash: { [key: string]: number } = {};
    orders.forEach((order) => {
      const method = order.delivery_method;
      deliveryHash[method] = (deliveryHash[method] || 0) + 1;
    });
    return Object.entries(deliveryHash).map(([name, value]) => ({
      name,
      value,
    }));
  }
}
