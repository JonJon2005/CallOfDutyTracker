"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CamosIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/camos/mastery");
  }, [router]);

  return null;
}
