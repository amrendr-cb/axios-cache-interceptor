import { parse } from '@tusbar/cache-control';
import { Header } from '../util/headers';
import type { HeaderInterpreter, HeadersInterpreter } from './types';

export const defaultHeaderInterpreter: HeadersInterpreter = (headers = {}) => {
  if (Header.CacheControl in headers) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return interpretCacheControl(headers[Header.CacheControl]!, headers);
  }

  if (Header.Expires in headers) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return interpretExpires(headers[Header.Expires]!, headers);
  }

  return undefined;
};

const interpretExpires: HeaderInterpreter = (expires) => {
  const milliseconds = Date.parse(expires) - Date.now();
  return milliseconds >= 0 ? milliseconds : false;
};

const interpretCacheControl: HeaderInterpreter = (cacheControl, headers) => {
  const { noCache, noStore, mustRevalidate, maxAge, immutable } = parse(cacheControl);

  // Header told that this response should not be cached.
  if (noCache || noStore) {
    return false;
  }

  if (immutable) {
    // 1 year is sufficient, as Infinity may cause more problems.
    // It might not be the best way, but a year is better than none.
    return 1000 * 60 * 60 * 24 * 365;
  }

  // Already out of date, for cache can be saved, but must be requested again
  if (mustRevalidate) {
    return 0;
  }

  if (maxAge) {
    const age = headers[Header.Age];

    if (!age) {
      return maxAge * 1000;
    }

    return maxAge * 1000 - Number(age) * 1000;
  }

  return undefined;
};
