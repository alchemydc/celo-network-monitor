export function logLevelDebug() {}

export function logLevelInfo() {
	console.debug = function () {};
}
export function logLevelWarn() {
	console.debug = function () {};
	console.log = function () {};
}
