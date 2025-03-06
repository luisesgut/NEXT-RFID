import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        try {
          const response = await axios.get("http://172.16.10.31/api/OperadoresRFID");
          const operadores = response.data;

          const operador = operadores.find(
            (op: any) => op.nombreOperador === credentials?.username
          );

          if (operador && operador.claveOperador === credentials?.password) {
            return {
              id: operador.id.toString(),
              name: operador.nombreOperador,
              rfid: operador.rfiD_Operador,
            };
          } else {
            return null;
          }
        } catch (error) {
          console.error("Error en autenticación:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string; 
        session.user.rfid = token.rfid as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.rfid = user.rfid;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`; // 🔄 Convertimos la ruta en una URL absoluta
      }
      return baseUrl; // En caso de un redirect externo, ir a la página principal
    }
    
    
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "SECRETO_SUPER_SEGURO",
});

export { handler as GET, handler as POST };
