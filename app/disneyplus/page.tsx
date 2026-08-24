import type { Metadata } from "next";
import DisneyClient from "./disney-client";

export const metadata: Metadata = {
  title: "Eventos Disney+ | Pulso TV",
  description: "Veja os eventos e transmissões em destaque na área Disney+.",
};

export default function DisneyPlusPage() {
  return <DisneyClient />;
}
