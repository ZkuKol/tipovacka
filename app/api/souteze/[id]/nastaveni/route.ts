import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

const ALLOWED_SPORTS = [
  "basketball",
  "football",
  "hockey",
  "tennis",
] as const;

const ALLOWED_QR_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

const MAX_QR_SIZE = 5 * 1024 * 1024;

function getString(
  value: FormDataEntryValue | null,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

function parseEntryFee(
  value: FormDataEntryValue | null,
): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const amount = Number(value);

  if (!Number.isInteger(amount) || amount < 0) {
    return null;
  }

  return amount;
}

export async function POST(
  request: Request,
  { params }: RouteProps,
) {
  const { id: competitionId } = await params;

  await requireAdmin(`/souteze/${competitionId}`);

  const formData = await request.formData();

  const sportValue = getString(formData.get("sport"));

  if (
    !sportValue ||
    !ALLOWED_SPORTS.includes(
      sportValue as (typeof ALLOWED_SPORTS)[number],
    )
  ) {
    return new NextResponse("Neplatný typ sportu.", {
      status: 400,
    });
  }

  const predictOverallWinner =
    formData.get("predictOverallWinner") === "true";

  const description = getString(
    formData.get("description"),
  );

  const entryFeeRaw = formData.get("entryFee");
  const entryFee = parseEntryFee(entryFeeRaw);

  if (
    typeof entryFeeRaw === "string" &&
    entryFeeRaw.trim() !== "" &&
    entryFee === null
  ) {
    return new NextResponse(
      "Startovné musí být celé nezáporné číslo.",
      {
        status: 400,
      },
    );
  }

  const paymentAccount = getString(
    formData.get("paymentAccount"),
  );

  const paymentBankCode = getString(
    formData.get("paymentBankCode"),
  );

  const paymentMessage = getString(
    formData.get("paymentMessage"),
  );

  if (
    paymentBankCode &&
    !/^\d{4}$/.test(paymentBankCode)
  ) {
    return new NextResponse(
      "Kód banky musí obsahovat přesně 4 číslice.",
      {
        status: 400,
      },
    );
  }

  const supabase = await createClient();

  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select("id, payment_qr_url")
      .eq("id", competitionId)
      .single();

  if (competitionError || !competition) {
    return new NextResponse(
      "Soutěž nebyla nalezena.",
      {
        status: 404,
      },
    );
  }

  let paymentQrUrl = competition.payment_qr_url;

  const qrFile = formData.get("paymentQr");

  if (qrFile instanceof File && qrFile.size > 0) {
    if (!ALLOWED_QR_TYPES.includes(qrFile.type)) {
      return new NextResponse(
        "QR kód musí být obrázek PNG, JPG nebo WebP.",
        {
          status: 400,
        },
      );
    }

    if (qrFile.size > MAX_QR_SIZE) {
      return new NextResponse(
        "QR kód může mít maximálně 5 MB.",
        {
          status: 400,
        },
      );
    }

    const extension =
      qrFile.type === "image/png"
        ? "png"
        : qrFile.type === "image/webp"
          ? "webp"
          : "jpg";

    const filePath =
      `${competitionId}/payment-qr.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-qr")
      .upload(filePath, qrFile, {
        contentType: qrFile.type,
        upsert: true,
      });

    if (uploadError) {
      return new NextResponse(
        `QR kód se nepodařilo nahrát: ${uploadError.message}`,
        {
          status: 500,
        },
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("payment-qr")
      .getPublicUrl(filePath);

    paymentQrUrl =
      `${publicUrlData.publicUrl}?v=${Date.now()}`;
  }

  const {
    data: updatedCompetition,
    error: updateError,
  } = await supabase
    .from("competitions")
    .update({
      sport: sportValue,
      predict_overall_winner: predictOverallWinner,
      description,
      entry_fee: entryFee,
      payment_account: paymentAccount,
      payment_bank_code: paymentBankCode,
      payment_message: paymentMessage,
      payment_qr_url: paymentQrUrl,
    })
    .eq("id", competitionId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return new NextResponse(
      `Nastavení se nepodařilo uložit: ${updateError.message}`,
      {
        status: 500,
      },
    );
  }

  if (!updatedCompetition) {
    return new NextResponse(
      "Nastavení se neuložilo: databáze neaktualizovala žádný řádek.",
      {
        status: 500,
      },
    );
  }

  revalidatePath(`/souteze/${competitionId}`);
  revalidatePath(`/souteze/${competitionId}/nastaveni`);
  revalidatePath(`/souteze/${competitionId}/tipy`);
  revalidatePath(`/souteze/${competitionId}/tabulka`);

  const forwardedHost =
    request.headers.get("x-forwarded-host");

  const host =
    forwardedHost ?? request.headers.get("host");

  if (!host) {
    return new NextResponse(
      "Nastavení bylo uloženo, ale nepodařilo se vytvořit návratovou adresu.",
      {
        status: 500,
      },
    );
  }

  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return NextResponse.redirect(
    `${protocol}://${host}/souteze/${competitionId}/nastaveni`,
    303,
  );
}
