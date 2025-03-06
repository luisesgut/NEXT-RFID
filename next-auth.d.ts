import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rfid: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    rfid: string;
  }

  interface JWT {
    rfid: string;
  }
}
