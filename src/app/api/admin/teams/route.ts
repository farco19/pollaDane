import { bootstrapDataLayer } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { buildFlagUrl, flagCountries } from "@/lib/flagcdn";
import { requireAdminUser } from "@/lib/server/session";
import { teamCreateSchema } from "@/lib/validators/team";
import { Match } from "@/models/Match";
import { Team } from "@/models/Team";

export async function GET() {
  try {
    await requireAdminUser();
    await bootstrapDataLayer();
    const teams = await Team.find({}).sort({ name: 1 }).lean();
    return ok(
      teams.map((team) => ({
        _id: String(team._id),
        name: team.name,
        shortName: team.shortName,
        countryCode: team.code.toLowerCase(),
        group: team.group ?? null,
        flagUrl: team.flagUrl ?? buildFlagUrl(team.code),
      })),
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar equipos", 403);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    await bootstrapDataLayer();
    const json = await request.json();
    const parsed = teamCreateSchema.safeParse(json);

    if (!parsed.success) {
      return fail("Equipo invalido", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    const countryCode = parsed.data.countryCode.toUpperCase();
    const country = flagCountries.find((item) => item.code === parsed.data.countryCode);

    if (!country) {
      return fail("El pais seleccionado no es valido", 400);
    }

    const existingTeam = await Team.findOne({ code: countryCode }).lean();

    if (existingTeam) {
      return fail("Ya existe un equipo creado para ese pais", 409);
    }

    const team = await Team.create({
      name: country.name,
      shortName: parsed.data.shortName,
      code: countryCode,
      flagUrl: buildFlagUrl(countryCode),
      group: parsed.data.group || null,
    });

    return ok({ _id: String(team._id) }, "Equipo creado");
  } catch (error) {
    if (error instanceof Error && /duplicate key/i.test(error.message)) {
      return fail("Ya existe un equipo creado para ese pais", 409);
    }
    return fail(error instanceof Error ? error.message : "No fue posible crear el equipo", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminUser();
    await bootstrapDataLayer();

    const json = await request.json().catch(() => ({}));
    const ids = Array.isArray(json.ids) ? json.ids.filter((value: unknown): value is string => typeof value === "string") : [];
    const deleteAll = json.deleteAll === true;

    if (!deleteAll && ids.length === 0) {
      return fail("Debes indicar los equipos a eliminar", 400);
    }

    const filter = deleteAll ? {} : { _id: { $in: ids } };
    const teams = await Team.find(filter).lean();

    if (!teams.length) {
      return ok({ deletedCount: 0 }, "No habia equipos para eliminar");
    }

    const teamIds = teams.map((team) => team._id);
    const matchesUsingTeams = await Match.countDocuments({
      $or: [{ homeTeamId: { $in: teamIds } }, { awayTeamId: { $in: teamIds } }],
    });

    if (matchesUsingTeams > 0) {
      return fail("No se pueden eliminar equipos que ya estan siendo usados en partidos. Elimina primero esos partidos.", 409);
    }

    const result = await Team.deleteMany({ _id: { $in: teamIds } });
    return ok({ deletedCount: result.deletedCount ?? 0 }, "Equipos eliminados");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible eliminar los equipos", 500);
  }
}
