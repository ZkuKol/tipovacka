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

function parseWinnerOptions(
  value: FormDataEntryValue | null,
): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function parsePragueDateTime(
  value: FormDataEntryValue | null,
): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;

  const wantedLocalMilliseconds = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  let utcMilliseconds = wantedLocalMilliseconds;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = formatter.formatToParts(
      new Date(utcMilliseconds),
    );

    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    const formattedLocalMilliseconds = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
    );

    const difference =
      wantedLocalMilliseconds - formattedLocalMilliseconds;

    if (difference === 0) {
      break;
    }

    utcMilliseconds += difference;
  }

  const date = new Date(utcMilliseconds);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
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

  const overallWinnerDeadlineRaw =
    formData.get("overallWinnerDeadline");

  const overallWinnerDeadline = parsePragueDateTime(
    overallWinnerDeadlineRaw,
  );

  if (
    typeof overallWinnerDeadlineRaw === "string" &&
    overallWinnerDeadlineRaw.trim() !== "" &&
    overallWinnerDeadline === null
  ) {
    return new NextResponse(
      "Uzávěrka tipu na celkového vítěze má neplatný formát.",
      {
        status: 400,
      },
    );
  }

  const winnerOptionNames = parseWinnerOptions(
    formData.get("winnerOptions"),
  );

  const requestedOverallWinnerOptionId = getString(
    formData.get("overallWinnerOptionId"),
  );

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
      .select(
        `
          id,
          payment_qr_url,
          overall_winner_option_id
        `,
      )
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

  const {
    data: existingWinnerOptionsData,
    error: existingWinnerOptionsError,
  } = await supabase
    .from("competition_winner_options")
    .select("id, name")
    .eq("competition_id", competitionId);

  if (existingWinnerOptionsError) {
    return new NextResponse(
      `Nepodařilo se načíst možné vítěze: ${existingWinnerOptionsError.message}`,
      {
        status: 500,
      },
    );
  }

  const existingWinnerOptions =
    existingWinnerOptionsData ?? [];

  const existingByName = new Map(
    existingWinnerOptions.map((option) => [
      option.name,
      option,
    ]),
  );

  const namesToInsert = winnerOptionNames.filter(
    (name) => !existingByName.has(name),
  );

  if (namesToInsert.length > 0) {
    const { error: insertOptionsError } = await supabase
      .from("competition_winner_options")
      .insert(
        namesToInsert.map((name) => ({
          competition_id: competitionId,
          name,
        })),
      );

    if (insertOptionsError) {
      return new NextResponse(
        `Nepodařilo se přidat možné vítěze: ${insertOptionsError.message}`,
        {
          status: 500,
        },
      );
    }
  }

  const namesToKeep = new Set(winnerOptionNames);

  const optionsToRemove = existingWinnerOptions.filter(
    (option) => !namesToKeep.has(option.name),
  );

  for (const option of optionsToRemove) {
    const {
      count,
      error: tipsCountError,
    } = await supabase
      .from("competition_winner_tips")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("winner_option_id", option.id);

    if (tipsCountError) {
      return new NextResponse(
        `Nepodařilo se ověřit tipy na ${option.name}: ${tipsCountError.message}`,
        {
          status: 500,
        },
      );
    }

    if ((count ?? 0) > 0) {
      return new NextResponse(
        `Možnost „${option.name}“ nelze odstranit, protože už na ni někdo tipoval.`,
        {
          status: 409,
        },
      );
    }

    if (
      competition.overall_winner_option_id === option.id
    ) {
      return new NextResponse(
        `Možnost „${option.name}“ nelze odstranit, protože je nastavená jako skutečný vítěz.`,
        {
          status: 409,
        },
      );
    }
  }

  if (optionsToRemove.length > 0) {
    const { error: deleteOptionsError } = await supabase
      .from("competition_winner_options")
      .delete()
      .in(
        "id",
        optionsToRemove.map((option) => option.id),
      );

    if (deleteOptionsError) {
      return new NextResponse(
        `Nepodařilo se odstranit možnosti vítěze: ${deleteOptionsError.message}`,
        {
          status: 500,
        },
      );
    }
  }

  const {
    data: currentWinnerOptions,
    error: currentWinnerOptionsError,
  } = await supabase
    .from("competition_winner_options")
    .select("id, name")
    .eq("competition_id", competitionId);

  if (currentWinnerOptionsError) {
    return new NextResponse(
      `Nepodařilo se načíst aktualizované možnosti vítěze: ${currentWinnerOptionsError.message}`,
      {
        status: 500,
      },
    );
  }

  let overallWinnerOptionId: string | null = null;

  if (requestedOverallWinnerOptionId) {
    const winnerExists =
      (currentWinnerOptions ?? []).some(
        (option) =>
          option.id === requestedOverallWinnerOptionId,
      );

    if (!winnerExists) {
      return new NextResponse(
        "Vybraný skutečný vítěz nepatří do této soutěže.",
        {
          status: 400,
        },
      );
    }

    overallWinnerOptionId =
      requestedOverallWinnerOptionId;
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
      overall_winner_deadline: overallWinnerDeadline,
      overall_winner_option_id: overallWinnerOptionId,
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

  /*
   * Pokud admin určil skutečného vítěze,
   * přepočítáme body všech tipů na vítěze.
   */
  if (overallWinnerOptionId) {
    const { error: resetPointsError } = await supabase
      .from("competition_winner_tips")
      .update({
        points: 0,
      })
      .eq("competition_id", competitionId);

    if (resetPointsError) {
      return new NextResponse(
        `Nepodařilo se vynulovat body tipů na vítěze: ${resetPointsError.message}`,
        {
          status: 500,
        },
      );
    }

    const { error: awardPointsError } = await supabase
      .from("competition_winner_tips")
      .update({
        points: 10,
      })
      .eq("competition_id", competitionId)
      .eq("winner_option_id", overallWinnerOptionId);

    if (awardPointsError) {
      return new NextResponse(
        `Nepodařilo se přidělit body za vítěze: ${awardPointsError.message}`,
        {
          status: 500,
        },
      );
    }
  } else {
    const { error: clearPointsError } = await supabase
      .from("competition_winner_tips")
      .update({
        points: 0,
      })
      .eq("competition_id", competitionId);

    if (clearPointsError) {
      return new NextResponse(
        `Nepodařilo se vynulovat body tipů na vítěze: ${clearPointsError.message}`,
        {
          status: 500,
        },
      );
    }
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
