import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Permitir el uso de 'any' temporalmente
      "@typescript-eslint/no-unused-vars": [
        "warn", // Cambiar de error a advertencia para variables no usadas
        { argsIgnorePattern: "^_" }, // Ignorar variables que comiencen con '_'
      ],
      "react-hooks/exhaustive-deps": "warn", // Cambiar de error a advertencia para dependencias de useEffect
    },
  },
];

export default eslintConfig;
