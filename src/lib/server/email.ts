import { LOOPS_API_KEY, LOOPS_LOGIN_EMAIL_TEMPLATE_ID } from '$env/static/private';

export async function sendLoginEmail(email: string, loginUrl: string) {
	const res = await fetch('https://app.loops.so/api/v1/transactional', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${LOOPS_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			transactionalId: LOOPS_LOGIN_EMAIL_TEMPLATE_ID,
			email,
			dataVariables: {
				loginUrl
			}
		})
	});

	if (!res.ok) {
		const error = await res.text();
		throw new Error(`Failed to send login email: ${error}`);
	}

	return await res.json();
}
