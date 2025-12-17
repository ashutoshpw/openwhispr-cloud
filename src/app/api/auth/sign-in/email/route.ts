import { baseServer } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getProviderName } from "@/lib/auth/config";

export async function POST(request: Request) {
  try {
    const providerName = getProviderName();
    const body = await request.text();
    
    if (providerName === "next-auth") {
      return NextResponse.json(
        { 
          error: { 
            message: "NextAuth sign-in must be handled client-side. Use signIn.email() from @/lib/auth-client instead. This API route is not used for NextAuth provider.",
            code: "CLIENT_SIDE_REQUIRED"
          } 
        },
        { status: 405 }
      );
    }

    const bodyData = JSON.parse(body);
    const { email, password } = bodyData;

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: "Email and password are required" } },
        { status: 400 }
      );
    }

    const result = await baseServer.signInEmail({ email, password });

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

