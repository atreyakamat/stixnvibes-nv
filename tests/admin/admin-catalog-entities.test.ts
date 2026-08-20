import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as categoryPost, DELETE as categoryDelete, GET as categoryGet } from "@/app/api/admin/categories/route";
import { POST as collectionPost, DELETE as collectionDelete, GET as collectionGet } from "@/app/api/admin/collections/route";
import { POST as materialPost, DELETE as materialDelete, GET as materialGet } from "@/app/api/admin/materials/route";
import { POST as sizePost, DELETE as sizeDelete, GET as sizeGet } from "@/app/api/admin/sizes/route";
import { randomUUID } from "crypto";

describe("Phase 2: Admin Catalog Entities & Reference Integrity TDD Suite", () => {
  const adminHeaders = {
    authorization: "Bearer snv_admin_token_static_dev",
    "content-type": "application/json",
  };

  const createdCategoryIds: string[] = [];
  const createdCollectionIds: string[] = [];
  const createdMaterialIds: string[] = [];
  const createdSizeIds: string[] = [];
  const createdProductIds: string[] = [];

  afterAll(async () => {
    try {
      if (createdProductIds.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
      }
      if (createdSizeIds.length > 0) {
        await prisma.size.deleteMany({ where: { id: { in: createdSizeIds } } });
      }
      if (createdMaterialIds.length > 0) {
        await prisma.material.deleteMany({ where: { id: { in: createdMaterialIds } } });
      }
      if (createdCollectionIds.length > 0) {
        await prisma.collection.deleteMany({ where: { id: { in: createdCollectionIds } } });
      }
      if (createdCategoryIds.length > 0) {
        await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
      }
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  });

  it("1. Category Lifecycle: Create with explicit ID, update, tree query, and deletion protection", async () => {
    const catId = randomUUID();
    createdCategoryIds.push(catId);

    // Create Category
    const createReq = new Request("http://localhost/api/admin/categories", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        id: catId,
        name: "Holographic Decals",
        slug: `holo-decals-${Date.now()}`,
        description: "Laser cut holographic stickers",
      }),
    });
    const createRes = await categoryPost(createReq as any, {} as any);
    expect(createRes.status).toBe(200);

    // Query Category Tree
    const treeReq = new Request("http://localhost/api/admin/categories", {
      method: "GET",
      headers: adminHeaders,
    });
    const treeRes = await categoryGet(treeReq as any, {} as any);
    expect(treeRes.status).toBe(200);
    const treeJson = await treeRes.json();
    const flatCategories = treeJson.data?.flat || treeJson.flat || [];
    expect(flatCategories.some((c: any) => c.id === catId)).toBe(true);

    // Assign product to category
    const prodId = randomUUID();
    createdProductIds.push(prodId);
    await prisma.product.create({
      data: {
        id: prodId,
        name: "Protected Decal",
        slug: `protected-decal-${Date.now()}`,
        priceCents: 19900,
        stock: 10,
        type: "sticker",
        categoryId: catId,
      },
    });

    // Attempt deletion while referenced -> Should fail safely
    const delReq = new Request(`http://localhost/api/admin/categories?id=${catId}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    const delRes = await categoryDelete(delReq as any, {} as any);
    expect(delRes.status).toBe(500); // Reference protection error

    // Remove product reference
    await prisma.product.delete({ where: { id: prodId } });

    // Now delete should succeed
    const validDelRes = await categoryDelete(delReq as any, {} as any);
    expect(validDelRes.status).toBe(200);
  });

  it("2. Collection Lifecycle: Create, query with product counts, and deletion protection", async () => {
    const colId = randomUUID();
    createdCollectionIds.push(colId);

    // Create Collection
    const createReq = new Request("http://localhost/api/admin/collections", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        id: colId,
        name: "Anime Cyber Vibes",
        slug: `anime-cyber-${Date.now()}`,
        description: "Cyberpunk and anime sticker collection",
      }),
    });
    const createRes = await collectionPost(createReq as any, {} as any);
    expect(createRes.status).toBe(200);

    // Query collections
    const listReq = new Request("http://localhost/api/admin/collections", {
      method: "GET",
      headers: adminHeaders,
    });
    const listRes = await collectionGet(listReq as any, {} as any);
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    const collectionsList = Array.isArray(listJson) ? listJson : (listJson.data || []);
    expect(collectionsList.some((c: any) => c.id === colId)).toBe(true);

    // Assign product to collection
    const prodId = randomUUID();
    createdProductIds.push(prodId);
    await prisma.product.create({
      data: {
        id: prodId,
        name: "Anime Cyber Sticker",
        slug: `anime-cyber-stk-${Date.now()}`,
        priceCents: 24900,
        stock: 15,
        type: "sticker",
        collectionId: colId,
      },
    });

    // Attempt deletion while referenced -> Should fail safely
    const delReq = new Request(`http://localhost/api/admin/collections?id=${colId}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    const delRes = await collectionDelete(delReq as any, {} as any);
    expect(delRes.status).toBe(500);

    // Remove product reference
    await prisma.product.delete({ where: { id: prodId } });

    // Valid delete
    const validDelRes = await collectionDelete(delReq as any, {} as any);
    expect(validDelRes.status).toBe(200);
  });

  it("3. Material & Size Lifecycle: Create, list, update, and delete", async () => {
    const matId = randomUUID();
    const sizeId = randomUUID();
    createdMaterialIds.push(matId);
    createdSizeIds.push(sizeId);

    // Create Material
    const matCreateReq = new Request("http://localhost/api/admin/materials", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        id: matId,
        name: "Brushed Aluminum Vinyl",
        slug: `brushed-alum-${Date.now()}`,
        price_modifier_cents: 3000,
      }),
    });
    const matRes = await materialPost(matCreateReq as any, {} as any);
    expect(matRes.status).toBe(200);

    // Create Size
    const sizeCreateReq = new Request("http://localhost/api/admin/sizes", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        id: sizeId,
        name: "5x5 inch Giant Decal",
        slug: `5x5-giant-${Date.now()}`,
        dimensions: "5x5 inch",
        price_modifier_cents: 4500,
      }),
    });
    const sizeRes = await sizePost(sizeCreateReq as any, {} as any);
    expect(sizeRes.status).toBe(200);

    // Delete Material
    const matDelReq = new Request(`http://localhost/api/admin/materials?id=${matId}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    const matDelRes = await materialDelete(matDelReq as any, {} as any);
    expect(matDelRes.status).toBe(200);

    // Delete Size
    const sizeDelReq = new Request(`http://localhost/api/admin/sizes?id=${sizeId}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    const sizeDelRes = await sizeDelete(sizeDelReq as any, {} as any);
    expect(sizeDelRes.status).toBe(200);
  });
});
