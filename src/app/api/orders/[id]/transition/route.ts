import { OrderService } from "@/lib/services/order-service";
import { $Enums } from "@prisma/client";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

const orderService = new OrderService();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json();
    
    if (!status) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }

    const updatedOrder = await orderService.updateOrderStatus(
      params.id,
      status as $Enums.order_status
    );

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (
      (error instanceof Error && error.name === 'InvalidStateTransitionError') ||
      (error instanceof Error && error.message.includes('Invalid order state transition'))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
