"use client";

import jsQR from "jsqr";
import { ChangeEvent, useState } from "react";

type ParsedPayment = {
  amount?: string;
  account?: string;
  bankCode?: string;
  message?: string;
};

function setInputValue(id: string, value?: string) {
  if (!value) {
    return;
  }

  const input = document.getElementById(id) as HTMLInputElement | null;

  if (input) {
    input.value = value;
  }
}

function parseCzechIban(iban: string) {
  const normalized = iban.replace(/\s/g, "").toUpperCase();

  if (!/^CZ\d{22}$/.test(normalized)) {
    return {};
  }

  const bankCode = normalized.slice(4, 8);
  const prefix = normalized.slice(8, 14);
  const account = normalized.slice(14, 24);

  const cleanPrefix = prefix.replace(/^0+/, "");
  const cleanAccount = account.replace(/^0+/, "");

  return {
    bankCode,
    account: cleanPrefix
      ? `${cleanPrefix}-${cleanAccount}`
      : cleanAccount,
  };
}

function parseSpayd(text: string): ParsedPayment | null {
  if (!text.startsWith("SPD*")) {
    return null;
  }

  const values = new Map<string, string>();

  for (const part of text.split("*")) {
    const separator = part.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);

    values.set(key, value);
  }

  const iban = values.get("ACC");
  const accountData = iban ? parseCzechIban(iban) : {};

  return {
    ...accountData,
    amount: values.get("AM"),
    message: values.get("MSG"),
  };
}

export default function PaymentQrReader() {
  const [status, setStatus] = useState<string | null>(null);

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setStatus("Načítám QR kód…");

    try {
      const bitmap = await createImageBitmap(file);

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const context = canvas.getContext("2d");

      if (!context) {
        setStatus("Obrázek se nepodařilo načíst.");
        return;
      }

      context.drawImage(bitmap, 0, 0);

      const imageData = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const qr = jsQR(
        imageData.data,
        imageData.width,
        imageData.height,
      );

      if (!qr?.data) {
        setStatus("QR kód se nepodařilo přečíst.");
        return;
      }

      const payment = parseSpayd(qr.data);

      if (!payment) {
        setStatus("QR kód není česká QR platba ve formátu SPAYD.");
        return;
      }

      setInputValue("entryFee", payment.amount);
      setInputValue("paymentAccount", payment.account);
      setInputValue("paymentBankCode", payment.bankCode);
      setInputValue("paymentMessage", payment.message);

      setStatus("QR přečteno – platební údaje byly doplněny.");
    } catch {
      setStatus("QR kód se nepodařilo přečíst.");
    }
  }

  return (
    <>
      <input
        id="paymentQr"
        name="paymentQr"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="mt-4 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700"
      />

      {status && (
        <p className="mt-3 text-sm font-semibold text-gray-700">
          {status}
        </p>
      )}
    </>
  );
}
