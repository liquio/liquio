export default (str: string): string => decodeURIComponent(escape(window.atob(str)));
