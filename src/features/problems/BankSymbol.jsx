/** A small, shared emblem family: gem books, cultivated field, sunflower. */
export function BankSymbol({ symbol }) {
  const book = <><path d="M15 12h29a5 5 0 0 1 5 5v35H19a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6" fill="currentColor" fillOpacity=".1" /><path d="M20 13v32m-7 1a5 5 0 0 1 5-4h31M19 48h24" /></>;
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {symbol === 'sapphire' ? <>{book}<path d="m35 17 8 5 3 9-11 7-11-7 3-9z" fill="currentColor" fillOpacity=".18" /><path d="m35 17-4 10 4 11 4-11zm-8 5 4 5-7 4m19-9-4 5 7 4M31 27h8" /></> : null}
    {symbol === 'ruby' ? <>{book}<path d="m28 23 4-5h7l5 5-8 12z" fill="currentColor" fillOpacity=".18" /><path d="M28 23h16m-12-5 4 17 3-17" /></> : null}
    {symbol === 'emerald' ? <>{book}<path d="m30 18-4 5v9l5 5h9l5-5v-9l-5-5z" fill="currentColor" fillOpacity=".14" /><path d="m30 18 2 6h7l1-6m-14 5 6 1v7l-6 1m19-9-6 1v7l6 1m-14 5 1-6h7l1 6" /></> : null}
    {symbol === 'field' ? <><path d="M9 43c14-11 32-11 46 0v10H9z" fill="currentColor" fillOpacity=".1" /><path d="M9 43c14-11 32-11 46 0M9 50c14-11 32-11 46 0M22 53c7-5 14-5 21 0M32 33V20" /><path d="M32 25C21 26 17 19 18 12c10 0 15 6 14 13Zm0-5c0-8 6-12 14-11 0 8-6 13-14 11Z" fill="currentColor" fillOpacity=".16" /><path d="m24 18 8 7m8-10-8 5" /></> : null}
    {symbol === 'sunflower' ? <>{Array.from({ length: 10 }, (_, index) => <ellipse key={index} cx="32" cy="17" rx="4.6" ry="8" transform={`rotate(${index * 36} 32 32)`} fill="currentColor" fillOpacity=".13" />)}<circle cx="32" cy="32" r="10" fill="currentColor" fillOpacity=".22" /><path d="m29 27 8 8m-11-3 8 8m-7-5 8-8m-3 11 7-7" strokeWidth="1.2" /></> : null}
  </svg>;
}
