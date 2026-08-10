import { prisma } from "@/lib/prisma";
import { Prisma, type Order, type OrderItem, $Enums } from "@prisma/client";

export interface OrderListParams {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sort?: "created_at" | "total_cents";
  order?: "asc" | "desc";
}

export class OrderRepository {
  async list(params: OrderListParams = {}): Promise<{ data: (Order & { items: OrderItem[] })[]; total: number }> {
    const limit = Math.min(params.limit ?? 100, 500);
    const offset = params.offset ?? 0;
    const sortField = params.sort === "total_cents" ? "totalCents" : "createdAt";
    const sortOrder = params.order ?? "desc";

    let where: Prisma.OrderWhereInput = {};
    if (params.search) {
      where.OR = [
        { customerName: { contains: params.search, mode: 'insensitive' } },
        { customerPhone: { contains: params.search, mode: 'insensitive' } },
        { customerEmail: { contains: params.search, mode: 'insensitive' } },
      ];
      // Note: UUID matching requires exact match or casting in Prisma, skipping id ilike for simplicity unless it's a valid UUID
      if (params.search.length === 36) {
        where.OR.push({ id: params.search });
      }
    }

    if (params.status && params.status !== "all") {
      where.status = params.status as $Enums.order_status;
    }

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [sortField]: sortOrder },
        include: { items: true },
      }),
      prisma.order.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string): Promise<(Order & { items: OrderItem[] }) | null> {
    return prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
  }

  async create(payload: Prisma.OrderUncheckedCreateInput, items: Prisma.OrderItemUncheckedCreateWithoutOrderInput[]): Promise<Order> {
    return prisma.order.create({
      data: {
        ...payload,
        items: {
          create: items,
        },
      },
    });
  }

  async updateStatus(id: string, status: $Enums.order_status): Promise<Order> {
    return prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async updateNotes(id: string, notes: string): Promise<Order> {
    return prisma.order.update({
      where: { id },
      data: { notes },
    });
  }

  async updateTracking(id: string, tracking_number: string, courier: string): Promise<Order> {
    const order = await prisma.order.findUnique({ where: { id }, select: { metadata: true } });
    if (!order) throw new Error("Order not found");

    const metadata = (order.metadata as any) || {};
    if (tracking_number !== undefined) metadata.tracking_number = tracking_number;
    if (courier !== undefined) metadata.courier = courier;

    return prisma.order.update({
      where: { id },
      data: { metadata },
    });
  }
}
