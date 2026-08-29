const canonicalOrigin = "https://pausesure.com";
const maximumReleaseVersionCharacters = 64;

export const createDeploymentSmokeTable = `
  CREATE TABLE IF NOT EXISTS deployment_smoke (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    web_version TEXT NOT NULL CHECK (
      length(web_version) BETWEEN 1 AND ${maximumReleaseVersionCharacters}
      AND web_version GLOB 'pausesure-web-[0-9]*.[0-9]*.[0-9]*'
    ),
    checked_at INTEGER NOT NULL CHECK (checked_at > 0)
  )
`;

const schemaInitializationByDatabase = new WeakMap<D1Database, Promise<void>>();

async function ensureDeploymentSmokeTable(database: D1Database) {
  let initialization = schemaInitializationByDatabase.get(database);
  if (!initialization) {
    initialization = database.exec(createDeploymentSmokeTable)
      .then(() => undefined)
      .catch((error) => {
        schemaInitializationByDatabase.delete(database);
        throw error;
      });
    schemaInitializationByDatabase.set(database, initialization);
  }
  await initialization;
}

export interface DeploymentSmokeEnv {
  DB?: D1Database;
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export async function handleDeploymentSmoke(
  request: Request,
  env: DeploymentSmokeEnv,
  expectedVersion: string,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, {
      status: 405,
      headers: { allow: "POST", "cache-control": "no-store" },
    });
  }

  const url = new URL(request.url);
  if (url.origin !== canonicalOrigin || request.headers.get("origin") !== canonicalOrigin) {
    return jsonError("Canonical same-origin requests only.", 403);
  }
  if (
    expectedVersion.length < 1
    || expectedVersion.length > maximumReleaseVersionCharacters
    || !/^pausesure-web-\d+\.\d+\.\d+$/u.test(expectedVersion)
    || request.headers.get("x-pausesure-release-version") !== expectedVersion
  ) {
    return jsonError("Release verification was rejected.", 403);
  }
  const contentLength = request.headers.get("content-length");
  if ((contentLength !== null && contentLength !== "0") || request.body !== null) {
    return jsonError("Release verification does not accept a request body.", 400);
  }
  if (!env.DB) return jsonError("Release verification could not be completed.", 503);

  try {
    await ensureDeploymentSmokeTable(env.DB);
    await env.DB.prepare(`
      INSERT INTO deployment_smoke (id, web_version, checked_at)
      VALUES (1, ?, ?)
      ON CONFLICT (id)
      DO UPDATE SET web_version = excluded.web_version, checked_at = excluded.checked_at
    `).bind(expectedVersion, Math.floor(Date.now() / 1000)).run();
  } catch {
    return jsonError("Release verification could not be completed.", 503);
  }

  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}
