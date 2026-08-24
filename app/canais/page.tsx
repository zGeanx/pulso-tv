import type { Metadata } from "next";
import CanaisClient from "./canais-client";

export const metadata: Metadata = {
  title: "Canais ao vivo | Pulso TV",
  description: "Encontre canais ao vivo, filtre por categoria e veja o que está passando agora.",
};

export default function CanaisPage() {
  return <CanaisClient />;
}
