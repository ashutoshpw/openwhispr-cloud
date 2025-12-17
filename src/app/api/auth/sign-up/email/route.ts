import { baseServer } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;
    
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: { message: "Email, password, and name are required" } },
        { status: 400 }
      );
    }

    const result = await baseServer.signUpEmail({ email, password, name });
    
    if (result?.error) {
      return NextResponse.json(
        { error: { message: result.error.message, code: result.error.code } },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ data: result?.data });
    
    if (result?.data && (result.data as any)._cookies) {
      const cookies = (result.data as any)._cookies as string[];
      cookies.forEach(cookie => {
        const [nameValue, ...attributes] = cookie.split(';');
        const [name, value] = nameValue.split('=').map(s => s.trim());
        
        if (name && value) {
          const options: any = {};
          attributes.forEach(attr => {
            const [key, val] = attr.split('=').map(s => s.trim());
            const lowerKey = key.toLowerCase();
            if (lowerKey === 'path') {
              options.path = val || '/';
            } else if (lowerKey === 'max-age') {
              options.maxAge = parseInt(val, 10);
            } else if (lowerKey === 'httponly') {
              options.httpOnly = true;
            } else if (lowerKey === 'secure') {
              options.secure = true;
            } else if (lowerKey === 'samesite') {
              options.sameSite = (val || 'lax').toLowerCase();
            }
          });
          
          response.cookies.set(name, value, options);
        }
      });
      
      delete (result.data as any)._cookies;
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Internal server error" } },
      { status: 500 }
    );
  }
}

