import { NextResponse } from "next/server";
import { PrismaClient } from "../../../generated/prisma/client";
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const templates = await prisma.apiTemplate.findMany({
      orderBy: { name: "asc" }
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching API templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}
