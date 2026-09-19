import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authorize } from '$lib/server/authorize';
import { getContainerTagsMap } from '$lib/server/db';

function parseEnv(raw: string | null): number | null {
	if (!raw) return null;
	const n = parseInt(raw, 10);
	return Number.isNaN(n) ? null : n;
}

/**
 * @openapi
 * summary: List all container tag assignments for an environment as a name -> tagIds map
 * description: Returns every container that has tags assigned in the given environment, so the containers list can render and filter by tag in one request instead of one lookup per row.
 * query: env:integer Environment id
 * resp-200: A JSON object mapping container name to its array of tag ids
 * resp-200-example: {"plex":[1,5],"authelia":[3]}
 * resp-403: Permission denied (needs containers:view)
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
	const auth = await authorize(cookies);
	const envId = parseEnv(url.searchParams.get('env'));
	if (auth.authEnabled && !(await auth.can('containers', 'view', envId ?? undefined))) {
		return json({ error: 'Permission denied' }, { status: 403 });
	}
	return json(await getContainerTagsMap(envId));
};
