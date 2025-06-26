import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("Auth attempt for email:", credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials")
          return null
        }

        try {
          // Veritabanından kullanıcıyı bul
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          console.log("User found:", user ? "Yes" : "No")

          if (!user || !user.password) {
            console.log("User not found or no password")
            return null
          }

          // Şifreyi karşılaştır
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          console.log("Password valid:", isPasswordValid)

          if (!isPasswordValid) {
            console.log("Invalid password")
            return null
          }

          console.log("Auth successful for user:", user.email)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user && account) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  debug: true
} 