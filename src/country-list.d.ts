declare module 'country-list' {
	interface Country {
		code: string;
		name: string;
	}

	export function getName(code: string): string | undefined;
	export function getCode(name: string): string | undefined;
	export function getNames(): string[];
	export function getCodes(): string[];
	export function getData(): Country[];
	export function overwrite(countries: Country[]): void;

	const countryList: {
		getName: typeof getName;
		getCode: typeof getCode;
		getNames: typeof getNames;
		getCodes: typeof getCodes;
		getData: typeof getData;
		overwrite: typeof overwrite;
	};

	export default countryList;
}
