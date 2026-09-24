// Static image assets used by pages that don't yet pull from the API (e.g. disney.tsx).
// All channel / event data is now served by src/lib/api.ts → https://api.reidoscanais.st

import cinemaImage from "@/assets/pulso-cinema.jpg";
import kidsImage from "@/assets/pulso-kids.jpg";
import newsroomImage from "@/assets/pulso-newsroom.jpg";
import stadiumImage from "@/assets/pulso-stadium.jpg";

export const images = { stadiumImage, newsroomImage, cinemaImage, kidsImage };
