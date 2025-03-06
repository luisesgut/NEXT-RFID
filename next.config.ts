import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['calibri.mx', 'darsis.us'], // Agrega aquí el dominio permitido
    unoptimized: true, // Deshabilita la optimización de imágenes
  },
  // output: 'export', // ❌ Eliminar o comentar esta línea
};

export default nextConfig;

