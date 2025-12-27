export function formatDate(date: Date | string): string {
	return new Date(date).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function getStatusColor(status: string): string {
	switch (status) {
		case 'pending':
			return 'bg-[#f7d8a7] text-[#7a4b21]';
		case 'fulfilled':
			return 'bg-[#d5f5d4] text-[#2f7d43]';
		case 'rejected':
			return 'bg-[#f6c4c0] text-[#963135]';
		default:
			return 'bg-[#ead2b2] text-[#5b3522]';
	}
}

export function pluralize(count: number, singular: string, plural?: string): string {
	return count === 1 ? singular : (plural ?? singular + 's');
}
