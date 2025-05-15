"use client"

import { RefObject } from "react"
import { toast } from "@/components/ui/use-toast"

interface PdfGeneratorProps {
  invoiceRef: RefObject<HTMLDivElement | null>
  invoiceNumber: string
}

export async function generatePdf({ invoiceRef, invoiceNumber }: PdfGeneratorProps): Promise<void> {
  if (typeof window === 'undefined' || !invoiceRef.current) {
    toast({
      title: "Error",
      description: "Could not generate PDF. Please try again.",
      variant: "destructive",
    });
    return;
  }

  try {
    const element = invoiceRef.current;
    const opt = {
      margin: 1,
      filename: `Invoice-${invoiceNumber}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "cm", format: "a4", orientation: "portrait" }
    };

    // Dynamically import html2pdf only on the client side
    const html2pdfModule = await import("html2pdf.js");
    await html2pdfModule.default().from(element).set(opt).save();
  } catch (error: unknown) {
    console.error("Error generating PDF:", error instanceof Error ? error.message : error);
    toast({
      title: "Error",
      description: "Failed to generate PDF. Please try again.",
      variant: "destructive",
    });
  }
} 