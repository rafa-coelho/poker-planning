import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const body = await req.json();
  const { gameName } = body;

  if (!gameName) {
    return NextResponse.json({ error: "Nome da sessão é obrigatório" }, { status: 400 });
  }

  const sessionId = uuidv4();
  return NextResponse.json({ sessionId, gameName });
}
